"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { addStockToWatchlist, removeStock } from "@/lib/actions/watchlist.actions";
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
      if (watched) {
        const res = await removeStock(symbol, pathname);
        if (res?.success) {
          setWatched(false);
          toast.success(`已从自选单移除`);
        } else {
          toast.error("移除失败");
        }
      } else {
        const category = window.prompt(
          `你要把 ${symbol} 加入哪个分组？\n(提示：直接点确定，将加入"默认列表")`, 
          "默认列表"
        );

        if (category !== null) { 
          const finalCategory = category.trim() === "" ? "默认列表" : category.trim();
          const res = await addStockToWatchlist(symbol, pathname, finalCategory);
          
          if (res?.success) {
            setWatched(true);
            toast.success(`成功加入 [${finalCategory}]`);
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
