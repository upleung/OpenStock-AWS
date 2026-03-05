"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { addStockToWatchlist, removeStock } from "@/lib/actions/watchlist.actions"; // 确保路径对应你的项目
import { usePathname } from "next/navigation";
import { toast } from "sonner";

export default function WatchlistButton({ 
  symbol, 
  isWatched = false 
}: { 
  symbol: string, 
  isWatched?: boolean 
}) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [watched, setWatched] = useState(isWatched);

  const toggleWatchlist = () => {
    startTransition(async () => {
      // 逻辑 A: 如果已经在自选里，点击就是“移除”
      if (watched) {
        const res = await removeStock(symbol, pathname);
        if (res?.success) {
          setWatched(false);
          toast.success(`已将 ${symbol} 从自选单移除`);
        } else {
          toast.error("移除失败");
        }
      } 
      // 逻辑 B: 如果不在自选里，点击就是“添加”
      else {
        // 👇 核心魔改：弹窗询问分组名称 👇
        const category = window.prompt(
          `你要把 ${symbol} 加入哪个分组？\n(提示：直接点确定或回车，将加入"默认列表")`, 
          "默认列表" // 默认值
        );

        // 如果用户点击了“取消”，category 就是 null，我们什么都不做
        if (category !== null) { 
          // 处理一下空格，如果用户清空了输入框，就强制设为"默认列表"
          const finalCategory = category.trim() === "" ? "默认列表" : category.trim();
          
          // 调用后端 API，带上我们输入的分类名
          const res = await addStockToWatchlist(symbol, pathname, finalCategory);
          
          if (res?.success) {
            setWatched(true);
            toast.success(`成功！已将 ${symbol} 加入 [${finalCategory}]`);
          } else {
            toast.error(res?.message || "添加失败");
          }
        }
      }
    });
  };

  return (
    <Button
      variant={watched ? "default" : "outline"}
      size="sm"
      onClick={toggleWatchlist}
      disabled={isPending}
      className={`gap-2 transition-all ${watched ? "bg-yellow-500 hover:bg-yellow-600 text-white border-none" : ""}`}
    >
      <Star className={`w-4 h-4 ${watched ? "fill-white" : ""}`} />
      {watched ? "已在自选" : "加入自选"}
    </Button>
  );
}
