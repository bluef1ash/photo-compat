use crate::config::Config;
use crate::error::{AppError, AppResult};
use image::{DynamicImage, ImageFormat};
use std::io::BufReader;
use std::path::{Path, PathBuf};

/// 转换单个文件为兼容 JPEG。
/// 步骤(附录 A):decode → 自动修正方向 → resize 到 max 边 → 重编码为 Baseline JPEG。
/// 重编码天然移除 EXIF/ICC(image 默认不嵌入)。HEIC 在 MVP 跳过(§10.13)。
pub fn convert_file(input: &Path, output: &Path, cfg: &Config) -> AppResult<()> {
    // HEIC:MVP 不转换,显式跳过
    if let Some(ext) = input.extension().and_then(|e| e.to_str()) {
        let ext = ext.to_ascii_lowercase();
        if matches!(ext.as_str(), "heic" | "heif") {
            return Err(AppError::Unsupported(
                "HEIC 转换在 MVP 暂未启用".to_string(),
            ));
        }
    }

    let reader = image::ImageReader::open(input)
        .map_err(|e| AppError::Io(e.to_string()))?;
    let reader = reader.with_guessed_format().map_err(|e| AppError::Io(e.to_string()))?;
    let mut img: DynamicImage = reader
        .decode()
        .map_err(|_| AppError::Corrupt(input.to_string_lossy().to_string()))?;

    // 自动修正方向(§附录 A):读 EXIF Orientation 并应用
    if cfg.auto_orient {
        if let Some(orient) = read_orientation(input) {
            img = apply_orientation(img, orient);
        }
    }

    // resize:超过 max 边等比缩小(附录 A 最大宽高 4096)
    let (w, h) = (img.width(), img.height());
    let max_w = cfg.max_width;
    let max_h = cfg.max_height;
    if w > max_w || h > max_h {
        img = img.resize(max_w, max_h, image::imageops::FilterType::Lanczos3);
    }

    // 转 sRGB 近似 + 移除 ICC:image 默认编码即不嵌入 ICC;转 8-bit RGB
    let rgb = img.to_rgb8();

    // 编码为 Baseline JPEG(image 默认 DCT baseline,非渐进式 → 满足 §附录 A)
    rgb.save_with_format(output, ImageFormat::Jpeg)
        .map_err(|e| AppError::Io(e.to_string()))?;
    Ok(())
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
}
