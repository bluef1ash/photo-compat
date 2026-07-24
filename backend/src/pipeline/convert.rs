use crate::config::Config;
use crate::error::{AppError, AppResult};
use image::{codecs::jpeg::JpegEncoder, DynamicImage, ExtendedColorType, ImageDecoder, ImageEncoder};
use std::io::BufReader;
use std::path::{Path, PathBuf};

/// 转换单个文件为兼容 JPEG。
/// 步骤(附录 A):decode(+取 ICC) → 自动修正方向 → to_srgb(lcms2) → resize → 按开关编码 JPEG。
/// remove_exif/remove_icc=false 时把原段写回；baseline_jpeg=false 输出渐进式 JPEG。
/// HEIC 在启用 `heic` 特性且 convert_heic=true 时经 libheif 解码（注册 image 钩子后复用本管线）。
pub fn convert_file(input: &Path, output: &Path, cfg: &Config) -> AppResult<()> {
    // HEIC/HEIF 入口：按编译特性与 convert_heic 开关决定是否进入解码
    if is_heic(input) {
        #[cfg(feature = "heic")]
        {
            // 关闭了 HEIC 转换开关 → 跳过（诚实告知，不静默丢弃）
            if !cfg.convert_heic {
                return Err(AppError::Unsupported("已关闭 HEIC 转换".to_string()));
            }
            // 注册 libheif 解码钩子（幂等），让下方 image::ImageReader 识别 HEIC/HEIF/AVIF
            ensure_heif_hooks_registered();
            // 此后走与普通图片相同的 decode→orient→to_srgb→resize→encode 管线
        }
        #[cfg(not(feature = "heic"))]
        {
            // 编译期未启用 heic 特性（无 libheif）→ 跳过
            return Err(AppError::Unsupported(
                "HEIC 转换需要编译时启用 heic 特性（libheif）".to_string(),
            ));
        }
    }

    let input_str = input.to_string_lossy().to_string();
    // 读取原始字节：remove_exif=false 时把原 EXIF APP1 段原样写回输出
    let raw = std::fs::read(input).unwrap_or_default();

    // 解码并取出 ICC profile（remove_icc=false 时写回输出）
    let reader = image::ImageReader::open(input).map_err(|e| AppError::Io(e.to_string()))?;
    let reader = reader.with_guessed_format().map_err(|e| AppError::Io(e.to_string()))?;
    let mut decoder = reader.into_decoder().map_err(|_| AppError::Corrupt(input_str.clone()))?;
    let icc_profile = decoder.icc_profile().ok().flatten();
    let mut img = DynamicImage::from_decoder(decoder)
        .map_err(|_| AppError::Corrupt(input_str.clone()))?;

    // 自动修正方向(§附录 A):读 EXIF Orientation 并应用
    if cfg.auto_orient {
        if let Some(orient) = read_orientation(input) {
            img = apply_orientation(img, orient);
        }
    }

    // resize:超过 max 边等比缩小(附录 A 最大宽高 4096)
    if img.width() > cfg.max_width || img.height() > cfg.max_height {
        img = img.resize(
            cfg.max_width,
            cfg.max_height,
            image::imageops::FilterType::Lanczos3,
        );
    }

    // 转 8-bit RGB
    let mut rgb = img.to_rgb8();
    // to_srgb：有源 ICC 时用 lcms2 做色彩空间转换（源→sRGB）；无 ICC 直通
    if cfg.to_srgb {
        if let Some(icc) = icc_profile.as_ref() {
            transform_to_srgb(&mut rgb, icc);
        }
    }
    let quality = cfg.jpeg_quality.clamp(1, 100);

    // 先编码到内存，便于按开关做 EXIF 字节注入
    let mut buf: Vec<u8> = Vec::new();
    if cfg.baseline_jpeg {
        // Baseline JPEG（默认）：image JpegEncoder 支持 ICC 写回
        let mut enc = JpegEncoder::new_with_quality(&mut buf, quality);
       if !cfg.remove_icc {
           if let Some(p) = icc_profile.as_ref() {
                // baseline JPEG 必然支持 ICC；忽略不可能出现的 UnsupportedError
                let _ = enc.set_icc_profile(p.clone());
           }
       }
        enc.encode(&rgb, rgb.width(), rgb.height(), ExtendedColorType::Rgb8)
            .map_err(|e| AppError::Io(e.to_string()))?;
    } else {
        // 渐进式 JPEG（baseline_jpeg=false）：jpeg-encoder 纯 Rust 编码器
       let mut enc = jpeg_encoder::Encoder::new(&mut buf, quality);
       enc.set_progressive(true);
       if !cfg.remove_icc {
           if let Some(p) = icc_profile.as_ref() {
                let _ = enc.add_icc_profile(p);
           }
       }
        enc.encode(
            &rgb,
            rgb.width() as u16,
            rgb.height() as u16,
            jpeg_encoder::ColorType::Rgb,
        )
           .map_err(|e| AppError::Io(e.to_string()))?;
    }

    // 保留 EXIF（remove_exif=false）：写回原 APP1 段；若已修正方向，把 Orientation 改为 1 避免二次旋转
    if !cfg.remove_exif {
        if let Some(mut seg) = extract_exif_app1(&raw) {
            if cfg.auto_orient {
                set_exif_orientation_one(&mut seg);
            }
            inject_exif_app1(&mut buf, &seg);
        }
    }

    std::fs::write(output, buf).map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
}

/// 用 lcms2 把 RGB8 像素从源 ICC 色彩空间转换到 sRGB（to_srgb=true 且源含 ICC 时调用）。
/// 失败（ICC 损坏等）静默回退为直通，不阻断主流程（§诚实：宁可保留原色也不报错中断）。
fn transform_to_srgb(pixels: &mut [u8], icc: &[u8]) {
    // 解析源 ICC；解析失败则无法转换，保留原始像素
    let Ok(src) = lcms2::Profile::new_icc(icc) else {
        return;
    };
    let dst = lcms2::Profile::new_srgb();
    // 构造源→sRGB 的 8-bit RGB 转换；失败同样回退直通
    let Ok(t) = lcms2::Transform::new(
        &src,
        lcms2::PixelFormat::RGB_8,
        &dst,
        lcms2::PixelFormat::RGB_8,
        lcms2::Intent::Perceptual,
    ) else {
        return;
    };
    // RgbImage: DerefMut<Target=[u8]>，[u8] 视作 RGB_8（每像素 3 字节）原地转换
    t.transform_in_place(pixels);
}

/// 判断是否 HEIC/HEIF 扩展名（大小写不敏感）。
fn is_heic(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_ascii_lowercase())
            .as_deref(),
        Some("heic") | Some("heif"),
    )
}

/// 幂等注册 libheif 的 image 解码钩子（HEIC/HEIF/AVIF）。仅在 heic 特性下编译。
#[cfg(feature = "heic")]
fn ensure_heif_hooks_registered() {
    use std::sync::Once;
    static REGISTER: Once = Once::new();
    // image::hooks 内部已对重复注册去重，这里再用 Once 避免重复函数调用
    REGISTER.call_once(libheif_rs::integration::image::register_all_decoding_hooks);
}

/// 从原始 JPEG 字节提取 EXIF APP1 段（含 FF E1 头与长度）。非 JPEG 或无 EXIF 返回 None。
fn extract_exif_app1(data: &[u8]) -> Option<Vec<u8>> {
    if data.len() < 4 || data[0] != 0xFF || data[1] != 0xD8 {
        return None;
    }
    let mut i = 2;
    while i + 4 <= data.len() {
        if data[i] != 0xFF {
            break;
        }
        let marker = data[i + 1];
        if marker == 0xDA {
            break;
        }
        if (0xD0..=0xD9).contains(&marker) {
            i += 2;
            continue;
        }
        let len = u16::from_be_bytes([data[i + 2], data[i + 3]]) as usize;
        if len < 2 || i + 2 + len > data.len() {
            break;
        }
        if marker == 0xE1 && len >= 8 && &data[i + 4..i + 10] == b"Exif\0\0" {
            return Some(data[i..i + 2 + len].to_vec());
        }
        i += 2 + len;
    }
    None
}

/// 把 EXIF APP1 段插入已编码 JPEG 的 SOI 之后（标准 EXIF 位置）。
fn inject_exif_app1(jpeg: &mut Vec<u8>, segment: &[u8]) {
    if jpeg.len() < 2 || jpeg[0] != 0xFF || jpeg[1] != 0xD8 {
        return;
    }
    jpeg.splice(2..2, segment.iter().copied());
}

/// 把 EXIF 段内 IFD0 的 Orientation 改为 1（已应用旋转后避免查看器二次旋转）。兼容大/小端。
fn set_exif_orientation_one(segment: &mut Vec<u8>) {
    let tiff_start = 10;
    if segment.len() < tiff_start + 8 {
        return;
    }
    let little = &segment[tiff_start..tiff_start + 2] == b"II";
    let rd = |b: &[u8]| -> u16 {
        if little {
            u16::from_le_bytes([b[0], b[1]])
        } else {
            u16::from_be_bytes([b[0], b[1]])
        }
    };
    let ifd_off = rd(&segment[tiff_start + 4..tiff_start + 8]) as usize;
    let ifd0 = tiff_start + ifd_off;
    if ifd0 + 2 > segment.len() {
        return;
    }
    let count = rd(&segment[ifd0..ifd0 + 2]) as usize;
    let mut p = ifd0 + 2;
    for _ in 0..count {
        if p + 12 > segment.len() {
            return;
        }
        if rd(&segment[p..p + 2]) == 0x0112 {
            if little {
                segment[p + 8] = 1;
                segment[p + 9] = 0;
            } else {
                segment[p + 8] = 0;
                segment[p + 9] = 1;
            }
            return;
        }
        p += 12;
    }
}

/// 读 EXIF Orientation(kamadak-exif)。无 EXIF 返回 None。
fn read_orientation(path: &Path) -> Option<u8> {
    let file = std::fs::File::open(path).ok()?;
    let mut buf = BufReader::new(&file);
    let exif = exif::Reader::new().read_from_container(&mut buf).ok()?;
    exif.get_field(exif::Tag::Orientation, exif::In::PRIMARY)
        .and_then(|f| f.value.get_uint(0))
        .map(|v| v as u8)
}

/// 按 EXIF Orientation 值应用变换(spec §附录 A 自动修正方向)。
fn apply_orientation(img: DynamicImage, orient: u8) -> DynamicImage {
    match orient {
        2 => img.fliph(),
        3 => img.rotate180(),
        4 => img.flipv(),
        5 => img.rotate90().fliph(),
        6 => img.rotate90(),
        7 => img.rotate270().fliph(),
        8 => img.rotate270(),
        _ => img,
    }
}

/// 计算输出路径:保持结构 + 不覆盖/加序号(§1.4,§15.8)
pub fn resolve_output_path(
    input: &Path,
    source_root: &Path,
    out_root: &Path,
    cfg: &Config,
) -> PathBuf {
    let rel = input.strip_prefix(source_root).unwrap_or(input);
    let mut out = out_root.to_path_buf();
    if cfg.keep_structure {
        if let Some(parent) = rel.parent() {
            out.push(parent);
        }
    }
    // 改扩展名为 .jpg
    let stem = rel
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    out.push(format!("{}.jpg", stem));

    // 不覆盖:同名加序号(§15.8)
    if !cfg.overwrite {
        let mut n = 1;
        while out.exists() {
            out.set_file_name(format!("{}_{}.jpg", stem, n));
            n += 1;
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageBuffer, Rgb, RgbImage};
    use std::fs;
    use tempfile::TempDir;

    /// 生成一张 100×80 的测试 JPEG
    fn make_test_jpeg(dir: &Path, name: &str) -> PathBuf {
        let img: RgbImage = ImageBuffer::from_pixel(100, 80, Rgb([200, 100, 50]));
        let path = dir.join(name);
        img.save(&path).unwrap();
        path
    }

    #[test]
    fn convert_jpeg_to_compat_jpeg() {
        let dir = TempDir::new().unwrap();
        let input = make_test_jpeg(dir.path(), "in.jpg");
        let output = dir.path().join("out.jpg");
        let cfg = crate::config::Config::default();

        convert_file(&input, &output, &cfg).unwrap();

        assert!(output.exists());
        // 输出仍是合法 JPEG 且可解码
        let meta = image::image_dimensions(&output).unwrap();
        assert_eq!(meta, (100, 80));
    }

    #[test]
    fn convert_resizes_when_over_max() {
        let dir = TempDir::new().unwrap();
        let img: RgbImage = ImageBuffer::from_pixel(5000, 1000, Rgb([10, 20, 30]));
        let input = dir.path().join("big.jpg");
        img.save(&input).unwrap();
        let output = dir.path().join("big_out.jpg");
        let mut cfg = crate::config::Config::default();
        cfg.max_width = 4096;
        cfg.max_height = 4096;

        convert_file(&input, &output, &cfg).unwrap();

        let (w, h) = image::image_dimensions(&output).unwrap();
        assert!(w <= 4096 && h <= 4096);
        assert_eq!(w, 4096); // 等比缩放,宽边落到 4096
    }

    #[test]
    fn convert_corrupt_file_returns_error() {
        // §15.7 图片损坏
        let dir = TempDir::new().unwrap();
        let input = dir.path().join("bad.jpg");
        fs::write(&input, b"not an image").unwrap();
        let output = dir.path().join("bad_out.jpg");
        let cfg = crate::config::Config::default();

        let res = convert_file(&input, &output, &cfg);
        assert!(matches!(res, Err(crate::error::AppError::Corrupt(_))));
    }

    /// 生成一张带渐变细节的测试图（纯色图压缩后质量差异不明显）
    fn make_gradient_jpeg(dir: &Path, name: &str) -> PathBuf {
        let (w, h) = (200u32, 200u32);
        let mut img: RgbImage = ImageBuffer::new(w, h);
        for y in 0..h {
            for x in 0..w {
                let r = ((x as f32 / w as f32) * 255.0) as u8;
                let g = ((y as f32 / h as f32) * 255.0) as u8;
                let b = (((x + y) as f32 / (w + h) as f32) * 255.0) as u8;
                img.put_pixel(x, y, Rgb([r, g, b]));
            }
        }
        let path = dir.join(name);
        img.save(&path).unwrap();
        path
    }

    #[test]
    fn jpeg_quality_affects_output_size() {
        // 质量参数必须真正传入编码器：高质量输出文件应显著大于低质量
        let dir = TempDir::new().unwrap();
        let input = make_gradient_jpeg(dir.path(), "src.jpg");

        let mut cfg_hi = crate::config::Config::default();
        cfg_hi.jpeg_quality = 100;
        let mut cfg_lo = crate::config::Config::default();
        cfg_lo.jpeg_quality = 20;

        let out_hi = dir.path().join("hi.jpg");
        let out_lo = dir.path().join("lo.jpg");
        convert_file(&input, &out_hi, &cfg_hi).unwrap();
        convert_file(&input, &out_lo, &cfg_lo).unwrap();

        let size_hi = fs::metadata(&out_hi).unwrap().len();
        let size_lo = fs::metadata(&out_lo).unwrap().len();
        assert!(
            size_hi > size_lo,
            "高质量({}B) 应大于低质量({}B)",
           size_hi,
           size_lo
       );
   }

    /// 构造一个最小的带 EXIF APP1 段的 JPEG 字节序列（仅用于字节操作测试，无需可解码）
    fn make_jpeg_with_exif(orientation: u16) -> Vec<u8> {
        // SOI + APP1(EXIF, 小端 IFD0 含 Orientation) + EOI
        let mut buf = vec![0xFF, 0xD8]; // SOI
        // EXIF 段内容："Exif\0\0" + TIFF(IFD0 offset=8, 1 entry: Orientation=orientation)
        let mut tiff = Vec::new();
        tiff.extend_from_slice(b"II"); // 小端
        tiff.extend_from_slice(&0x002Au16.to_le_bytes()); // TIFF magic
        tiff.extend_from_slice(&8u32.to_le_bytes()); // IFD0 偏移
        // IFD0: 1 个 entry
        tiff.extend_from_slice(&1u16.to_le_bytes()); // entry 数
        tiff.extend_from_slice(&0x0112u16.to_le_bytes()); // Orientation tag
        tiff.extend_from_slice(&3u16.to_le_bytes()); // type SHORT
        tiff.extend_from_slice(&1u32.to_le_bytes()); // count
        tiff.extend_from_slice(&orientation.to_le_bytes()); // value（内联）
        tiff.extend_from_slice(&[0u8, 0u8]); // value 字段剩余 2 字节
        tiff.extend_from_slice(&0x00000000u32.to_le_bytes()); // next IFD = 0
        let exif_payload_len = 6 + tiff.len(); // "Exif\0\0" + tiff
        buf.push(0xFF);
        buf.push(0xE1); // APP1
        buf.extend_from_slice(&((exif_payload_len + 2) as u16).to_be_bytes()); // 段长度含自身 2 字节
        buf.extend_from_slice(b"Exif\0\0");
        buf.extend_from_slice(&tiff);
        buf.extend_from_slice(&[0xFF, 0xD9]); // EOI
        buf
    }

    #[test]
    fn extract_exif_finds_app1_segment() {
        let jpeg = make_jpeg_with_exif(6);
        let seg = extract_exif_app1(&jpeg).expect("应提取到 EXIF 段");
        assert_eq!(&seg[0..2], &[0xFF, 0xE1]); // 段以 APP1 marker 开头
        assert_eq!(&seg[4..10], b"Exif\0\0"); // 含 Exif 签名
        // 无 EXIF 的纯字节应返回 None
        assert_eq!(extract_exif_app1(&[0xFF, 0xD8, 0xFF, 0xD9]), None);
    }

    #[test]
    fn set_orientation_resets_to_one() {
        let mut seg = extract_exif_app1(&make_jpeg_with_exif(6)).unwrap();
        set_exif_orientation_one(&mut seg);
        // 解析回 Orientation 值应变为 1（小端，IFD0 第一个 entry 的 value 在 tiff_start+8+2+8 = 偏移）
        // 直接用 kamadak-exif 不可行（它是只读），手动定位：tiff_start=10, IFD0 offset=8 → ifd0=18
        let ifd0 = 10 + 8;
        let entry_val_off = ifd0 + 2 + 8; // 跳过 count(2) + tag/type/count(8)
        let val = u16::from_le_bytes([seg[entry_val_off], seg[entry_val_off + 1]]);
        assert_eq!(val, 1, "Orientation 应被改为 1");
    }

    #[test]
    fn inject_exif_inserts_after_soi() {
        let mut jpeg = vec![0xFF, 0xD8, 0xFF, 0xD9]; // SOI + EOI
        let seg = vec![0xFF, 0xE1, 0x00, 0x04]; // 假段
        inject_exif_app1(&mut jpeg, &seg);
        // SOI 后紧跟注入段
        assert_eq!(&jpeg[0..2], &[0xFF, 0xD8]);
        assert_eq!(&jpeg[2..6], &[0xFF, 0xE1, 0x00, 0x04]);
    }

    #[test]
    fn convert_retains_exif_when_remove_exif_false() {
        // remove_exif=false 时输出应含 EXIF 段（字节比移除时大）
        let dir = TempDir::new().unwrap();
        let input = make_gradient_jpeg(dir.path(), "src.jpg");
        // 手工在输入 JPEG 注入 EXIF 段（image 编码的 JPEG 无 EXIF）
        let raw = std::fs::read(&input).unwrap();
        let exif_seg = extract_exif_app1(&make_jpeg_with_exif(6)).unwrap();
        let mut with_exif = vec![0xFF, 0xD8];
        with_exif.extend_from_slice(&exif_seg);
        with_exif.extend_from_slice(&raw[2..]);
        std::fs::write(&input, &with_exif).unwrap();

        let mut cfg_keep = crate::config::Config::default();
        cfg_keep.remove_exif = false; // 保留 EXIF
        let mut cfg_strip = crate::config::Config::default();
        cfg_strip.remove_exif = true; // 移除（默认）

        let out_keep = dir.path().join("keep.jpg");
        let out_strip = dir.path().join("strip.jpg");
        convert_file(&input, &out_keep, &cfg_keep).unwrap();
        convert_file(&input, &out_strip, &cfg_strip).unwrap();

        let keep_bytes = std::fs::read(&out_keep).unwrap();
        let strip_bytes = std::fs::read(&out_strip).unwrap();
        // 保留版应含 "Exif\0\0"，移除版不应
        assert!(keep_bytes.windows(6).any(|w| w == b"Exif\0\0"), "保留版应含 EXIF");
        assert!(!strip_bytes.windows(6).any(|w| w == b"Exif\0\0"), "移除版不应含 EXIF");
    }

    #[test]
    fn convert_outputs_progressive_when_baseline_false() {
        // baseline_jpeg=false 应输出渐进式 JPEG（含 SOF2 0xFFC2 而非 SOF0 0xFFC0）
        let dir = TempDir::new().unwrap();
        let input = make_gradient_jpeg(dir.path(), "src.jpg");

        let mut cfg_prog = crate::config::Config::default();
        cfg_prog.baseline_jpeg = false;
        let out_prog = dir.path().join("prog.jpg");
        convert_file(&input, &out_prog, &cfg_prog).unwrap();

        let bytes = std::fs::read(&out_prog).unwrap();
        // 扫描 markers 找 SOF（0xFFC0 baseline / 0xFFC2 progressive）
        let mut has_prog = false;
        let mut i = 2;
        while i + 3 < bytes.len() {
            if bytes[i] != 0xFF {
                break;
            }
            let m = bytes[i + 1];
            if m == 0xC2 {
                has_prog = true;
                break;
            }
            if (0xC0..=0xCF).contains(&m) && m != 0xC4 && m != 0xC8 && m != 0xCC {
                break; // 其他 SOF，非 progressive
            }
            if m == 0xDA {
                break;
            }
            if (0xD0..=0xD9).contains(&m) {
                i += 2;
                continue;
            }
            let len = u16::from_be_bytes([bytes[i + 2], bytes[i + 3]]) as usize;
            i += 2 + len;
        }
        assert!(has_prog, "baseline_jpeg=false 应输出渐进式 JPEG（含 SOF2）");
    }

    #[test]
    fn is_heic_detects_heic_extensions() {
        assert!(is_heic(Path::new("photo.HEIC")));
        assert!(is_heic(Path::new("photo.heif")));
        assert!(!is_heic(Path::new("photo.jpg")));
        assert!(!is_heic(Path::new("photo")));
    }

    #[test]
    fn to_srgb_transforms_pixels_per_icc() {
        use lcms2::{CIExyY, CIExyYTRIPLE, Profile, ToneCurve};

        // 横跨多种颜色的像素（红/绿/蓝/暖/冷），让两套 ICC 的差异充分体现。
        // 注：Adobe RGB 与 sRGB 的红色 primaries 几乎相同，纯红不足以区分。
        let original: [u8; 15] = [
            255, 0, 0, // 纯红
            0, 255, 0, // 纯绿（Adobe 绿远比 sRGB 绿饱和，差异最明显）
            0, 0, 255, // 纯蓝
            200, 100, 50, // 暖色
            60, 180, 220, // 冷色
        ];
        let mut pixels_srgb = original;
        let mut pixels_adobe = original;

        // 源 = sRGB → sRGB：近似恒等（不破坏已正确的颜色）
        let icc_srgb = Profile::new_srgb().icc().unwrap();
        transform_to_srgb(&mut pixels_srgb, &icc_srgb);
        // 每个通道近似不变（容忍 8-bit 量化误差）
        for (a, b) in pixels_srgb.iter().zip(original.iter()) {
            assert!(
                (*a as i16 - *b as i16).abs() <= 3,
                "sRGB->sRGB 应近似恒等，{a} 偏离 {b}"
            );
        }

        // 源 = Adobe RGB(1998) 宽色域：纯红经源→sRGB 必然改变数值
        let gamma = ToneCurve::new(2.2);
        let wp = CIExyY { x: 0.3127, y: 0.3290, Y: 1.0 };
        let primaries = CIExyYTRIPLE {
            Red: CIExyY { x: 0.64, y: 0.33, Y: 1.0 },
            Green: CIExyY { x: 0.21, y: 0.71, Y: 1.0 },
            Blue: CIExyY { x: 0.15, y: 0.06, Y: 1.0 },
        };
        let icc_adobe = Profile::new_rgb(&wp, &primaries, &[&gamma, &gamma, &gamma])
            .unwrap()
            .icc()
            .unwrap();
        transform_to_srgb(&mut pixels_adobe, &icc_adobe);
        // 多色输入下两套 ICC 必然产出不同结果 → 证明转换真实依赖 ICC（非直通 no-op）
        assert_ne!(
            pixels_srgb, pixels_adobe,
            "不同源 ICC 应产出不同 sRGB 结果"
        );
    }

    #[cfg(not(feature = "heic"))]
    #[test]
    fn heic_skipped_without_feature() {
        // 未启用 heic 特性时，HEIC 文件按「不支持」跳过（不尝试解码）
        let dir = TempDir::new().unwrap();
        let input = dir.path().join("fake.heic");
        std::fs::write(&input, b"not real heic").unwrap();
        let output = dir.path().join("fake.jpg");
        let cfg = crate::config::Config::default();
        let res = convert_file(&input, &output, &cfg);
        assert!(matches!(res, Err(crate::error::AppError::Unsupported(_))));
    }
}
