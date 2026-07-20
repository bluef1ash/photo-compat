import React from "react";
import { StatCard } from "../components/StatCard";
import { Button } from "../components/Button";
import { Icon } from "../icons/Icons";
import { useAppStore } from "../store/appStore";

export const CompletedView: React.FC = () => {
  const summary = useAppStore((s) => s.summary);
  const openOutput = useAppStore((s) => s.openOutput);
  const reset = useAppStore((s) => s.reset);
  if (!summary) return null;
  return (
    <div className='flex flex-col gap-6 max-w-4xl mx-auto'>
      <div className='text-center p-6'>
        <Icon name="check" size={72} />
        <h1 className='text-title mt-2 mb-0'>处理完成!</h1>
        <p className='text-fg-muted'>{summary.done} 张照片已转换为兼容格式</p>
      </div>
      <div className='grid grid-cols-4 gap-4'>
        <StatCard value={summary.total} label="总计处理" />
        <StatCard value={summary.done} label="成功" />
        <StatCard value={summary.failed} label="失败" tone={summary.failed > 0 ? "error" : "default"} />
        <StatCard value={summary.skipped} label="跳过" tone="muted" />
      </div>
      <div className='flex justify-end gap-3'>
        <Button onClick={reset}>处理另一个文件夹</Button>
        <Button variant="primary" size="large" onClick={openOutput}><Icon name="open" /> 打开输出目录</Button>
      </div>
    </div>
  );
};
