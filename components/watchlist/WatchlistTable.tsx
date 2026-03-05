"use client";

import React, { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, FolderOpen, ArrowUp, ArrowDown, MoveRight } from "lucide-react";
import WatchlistStockChip from "./WatchlistStockChip";
import { removeStock, updateStockCategory } from "@/lib/actions/watchlist.actions"; // 引入你刚才写的新后端动作
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface WatchlistTableProps {
  initialStocks: any[];
}

export default function WatchlistTable({ initialStocks }: WatchlistTableProps) {
  const [stocks, setStocks] = useState(initialStocks);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("默认列表");
  const [sortConfig, setSortConfig] = useState<{key: string | null, direction: "asc" | "desc"}>({ key: null, direction: "asc" });

  // 🌟 核心升级 1：从数据库的真实字段提取所有分组
  const groups = useMemo(() => {
    const list = new Set(["默认列表"]); // 保证至少有一个默认组
    stocks.forEach((s) => {
      if (s.category) list.add(s.category);
    });
    return Array.from(list);
  }, [stocks]);

  // 🌟 核心升级 2：只显示当前选中的“真实”分组里的股票
  const visibleStocks = useMemo(() => {
    let filtered = stocks.filter(s => (s.category || "默认列表") === activeTab);

    // 排序逻辑
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key] || 0;
        const bVal = b[sortConfig.key] || 0;
        if (typeof aVal === "string") {
          return sortConfig.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      });
    }
    return filtered;
  }, [stocks, activeTab, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(curr => ({ key, direction: curr.key === key && curr.direction === "asc" ? "desc" : "asc" }));
  };

  const handleDelete = async (symbol: string) => {
    const res = await removeStock(symbol, "/watchlist");
    if (res.success) {
      toast.success("已移除");
      setStocks(prev => prev.filter(s => s.symbol !== symbol));
    }
  };

  // 🌟 核心升级 3：移动股票到其他分组的逻辑
  const handleMoveCategory = async (symbol: string, newCategory: string) => {
    // 乐观更新前端UI，让它瞬间消失并转移到另一个Tab
    setStocks(prev => prev.map(s => s.symbol === symbol ? { ...s, category: newCategory } : s));
    toast.success(`已移动至 ${newCategory}`);
    
    // 调用后端保存进数据库
    const res = await updateStockCategory(symbol, newCategory, "/watchlist");
    if (!res.success) toast.error("移动保存失败，请刷新");
  };

  // 🌟 核心升级 4：新建分组的逻辑
  const handleCreateNewGroup = () => {
    const newGroupName = prompt("请输入新的分组名称：");
    if (newGroupName && newGroupName.trim() !== "") {
        setActiveTab(newGroupName.trim());
        // 注意：空分组不会存入数据库，直到你往里面移动一只股票为止
        toast.info("现在你可以将股票移动到这个新分组了");
    }
  };

  return (
    <div className="space-y-4">
      {/* 顶部：真实数据库驱动的分组 Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-border/40">
        {groups.map((group) => (
          <button
            key={group}
            onClick={() => setActiveTab(group)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === group ? "bg-primary text-primary-foreground shadow-md" : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            <FolderOpen className="w-4 h-4" /> {group}
          </button>
        ))}
        {/* 新建分组按钮 */}
        <Button onClick={handleCreateNewGroup} variant="ghost" size="sm" className="rounded-full gap-1">
            <Plus className="w-4 h-4" /> 新建分组
        </Button>
      </div>

      {/* 表格区域 */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead onClick={() => handleSort("symbol")} className="cursor-pointer">代码/名称</TableHead>
              <TableHead onClick={() => handleSort("value")} className="text-right cursor-pointer">现价 (Value)</TableHead>
              <TableHead onClick={() => handleSort("changePercent")} className="text-right cursor-pointer">涨跌幅 (Chg%)</TableHead>
              <TableHead className="text-center w-[120px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleStocks.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">该分组下暂无自选股</TableCell></TableRow>
            ) : (
              visibleStocks.map((stock) => (
                <TableRow key={stock._id}>
                  <TableCell className="font-medium"><WatchlistStockChip symbol={stock.symbol} /></TableCell>
                  <TableCell className="text-right font-mono">${stock.value?.toFixed(2) || "0.00"}</TableCell>
                  <TableCell className={`text-right font-mono font-bold ${stock.changePercent > 0 ? "text-green-500" : stock.changePercent < 0 ? "text-red-500" : ""}`}>
                    {stock.changePercent > 0 ? "+" : ""}{stock.changePercent?.toFixed(2) || "0.00"}%
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {/* 🌟 移动分组下拉菜单 🌟 */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" title="移动到其他分组"><MoveRight className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           {groups.map(g => (
                              g !== activeTab && (
                                <DropdownMenuItem key={g} onClick={() => handleMoveCategory(stock.symbol, g)}>
                                    移动至: {g}
                                </DropdownMenuItem>
                              )
                           ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(stock.symbol)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
