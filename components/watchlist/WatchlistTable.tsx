"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  GripVertical, 
  Trash2, 
  Plus,
  FolderOpen 
} from "lucide-react";
import WatchlistStockChip from "./WatchlistStockChip";
import { removeStock } from "@/lib/actions/watchlist.actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

// --- 1. 定义可拖拽的行组件 ---
function SortableRow({ stock, onDelete, children }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stock._id }); // 确保 stock 有 _id 字段

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    position: isDragging ? "relative" as const : undefined,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "bg-muted/50 shadow-xl border-2 border-primary/20")}
    >
      <TableCell className="w-[50px]">
        <div 
          {...attributes} 
          {...listeners} 
          className="cursor-grab hover:text-primary active:cursor-grabbing p-2"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>
      {children}
    </TableRow>
  );
}

// --- 2. 主组件 ---
interface WatchlistTableProps {
  initialStocks: any[];
  user: any;
}

const WatchlistTable = ({ initialStocks, user }: WatchlistTableProps) => {
  const [stocks, setStocks] = useState(initialStocks);
  const router = useRouter();

  // --- 分组功能状态 ---
  const [activeTab, setActiveTab] = useState("全部");

  // --- 排序功能状态 ---
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "asc" | "desc";
  }>({
    key: null,
    direction: "asc",
  });

  // --- 拖拽传感器设置 ---
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // --- 逻辑 A: 提取所有分组 (基于 #标签) ---
  const groups = useMemo(() => {
    const list = ["全部"];
    initialStocks.forEach((s) => {
      // 假设我们用 symbol 开头为 # 的作为分组标记，例如 #Tech
      // 或者你可以手动把某些股票归类。这里为了演示，我们先提取所有 # 开头的作为组名
      if (s.symbol && s.symbol.startsWith("#")) {
        list.push(s.symbol.replace("#", ""));
      }
    });
    // 如果没有自定义组，可以加几个默认的为了好看
    if (list.length === 1) list.push("默认列表");
    return Array.from(new Set(list)); // 去重
  }, [initialStocks]);

  // --- 逻辑 B: 删除股票 ---
  const handleDelete = async (symbol: string) => {
    try {
      const result = await removeStock(symbol, "/watchlist");
      if (result.success) {
        toast.success("已从自选单移除");
        // 前端乐观更新
        setStocks((prev) => prev.filter((s) => s.symbol !== symbol));
        router.refresh();
      } else {
        toast.error("移除失败");
      }
    } catch (error) {
      toast.error("发生错误");
    }
  };

  // --- 逻辑 C: 排序处理 ---
  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  // --- 逻辑 D: 计算最终显示的列表 (过滤 -> 排序) ---
  const visibleStocks = useMemo(() => {
    // 1. 过滤分组
    let filtered = [...stocks];
    
    // 如果是“全部”，显示所有非分组标题的股票
    // 如果你用了 #Hack，这里要把 #开头的标题项过滤掉，只显示真正的股票
    if (activeTab === "全部") {
       filtered = filtered.filter(s => !s.symbol.startsWith("#"));
    } else {
       // 这里是最难的：如何知道哪些股票属于哪个组？
       // 既然我们不动数据库，我们暂且用一个简单的逻辑：
       // 这里需要你后续配合：手动排序。
       // 比如：[#科技, AAPL, NVDA, #消费, KO, PEP]
       // 这种逻辑比较复杂，为了先让你跑通，我们这里暂时不做深度过滤。
       // 我们可以只显示“全部”，但加上排序功能。
       // 如果你想实现 Google Finance 那种，需要改数据库加 group_id。
       
       // 为了演示效果，我们暂时让它和“全部”一样，或者你可以按名字搜索过滤
       // 真正的分组需要后端支持。
       // 现阶段建议：只保留 "全部" 和 "排序"，或者做纯客户端分组（比如手动把 AAPL 归为 Tech）
    }

    // 2. 排序
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        // 安全获取属性，防止 null
        const aVal = a[sortConfig.key] || (sortConfig.key === 'symbol' ? a.symbol : 0);
        const bVal = b[sortConfig.key] || (sortConfig.key === 'symbol' ? b.symbol : 0);

        if (typeof aVal === "string") {
          return sortConfig.direction === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      });
    }

    return filtered;
  }, [stocks, activeTab, sortConfig]);

  // --- 逻辑 E: 拖拽结束 ---
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (sortConfig.key !== null) {
        toast.error("请先取消排序（点击表头直到无箭头）再进行拖拽");
        return;
    }
    if (active.id !== over?.id) {
      setStocks((items) => {
        const oldIndex = items.findIndex((i) => i._id === active.id);
        const newIndex = items.findIndex((i) => i._id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      // 注意：这里仅仅是前端拖拽，要想保存顺序，需要后端加 `order` 字段
      toast.success("排序已更新 (暂未保存到数据库)"); 
    }
  };

  return (
    <div className="space-y-4">
      {/* --- 顶部：分组 Tabs (仿 Google 财经) --- */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-border/40">
        {groups.map((group) => (
          <button
            key={group}
            onClick={() => setActiveTab(group)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2",
              activeTab === group
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {group === "全部" && <FolderOpen className="w-4 h-4" />}
            {group}
          </button>
        ))}
        <Button variant="ghost" size="sm" className="rounded-full gap-1 text-muted-foreground">
            <Plus className="w-4 h-4" /> 新建列表
        </Button>
      </div>

      {/* --- 表格区域 --- */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <Table>
            <TableHeader className="bg-muted/50">
                <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead 
                    className="cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort("symbol")}
                >
                    <div className="flex items-center gap-1">
                        Name 
                        {sortConfig.key === "symbol" && (
                            sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>
                        )}
                    </div>
                </TableHead>
                <TableHead 
                    className="text-right cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort("value")}
                >
                     <div className="flex items-center justify-end gap-1">
                        Value
                        {sortConfig.key === "value" && (
                            sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>
                        )}
                    </div>
                </TableHead>
                <TableHead 
                    className="text-right cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort("change")}
                >
                    <div className="flex items-center justify-end gap-1">
                        Change
                        {sortConfig.key === "change" && (
                            sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>
                        )}
                    </div>
                </TableHead>
                <TableHead 
                    className="text-right cursor-pointer hover:text-primary transition-colors"
                    onClick={() => handleSort("changePercent")}
                >
                    <div className="flex items-center justify-end gap-1">
                        Chg%
                        {sortConfig.key === "changePercent" && (
                            sortConfig.direction === "asc" ? <ArrowUp className="w-3 h-3"/> : <ArrowDown className="w-3 h-3"/>
                        )}
                    </div>
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
                </TableRow>
            </TableHeader>

            <SortableContext 
                items={visibleStocks.map(s => s._id)} 
                strategy={verticalListSortingStrategy}
            >
                <TableBody>
                {visibleStocks.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        列表为空
                    </TableCell>
                    </TableRow>
                ) : (
                    visibleStocks.map((stock) => (
                    <SortableRow key={stock._id} stock={stock} onDelete={handleDelete}>
                        <TableCell className="font-medium">
                            {/* 这里复用你原有的 Chip 组件 */}
                            <WatchlistStockChip symbol={stock.symbol} />
                        </TableCell>
                        <TableCell className="text-right font-mono">
                            ${stock.value?.toFixed(2) || "0.00"}
                        </TableCell>
                        <TableCell className={cn(
                            "text-right font-mono",
                            stock.change > 0 ? "text-green-500" : stock.change < 0 ? "text-red-500" : ""
                        )}>
                            {stock.change > 0 ? "+" : ""}{stock.change?.toFixed(2) || "0.00"}
                        </TableCell>
                        <TableCell className={cn(
                            "text-right font-mono font-bold",
                            stock.changePercent > 0 ? "text-green-500 bg-green-500/10 rounded-md py-1 px-2" : stock.changePercent < 0 ? "text-red-500 bg-red-500/10 rounded-md py-1 px-2" : ""
                        )}>
                            {stock.changePercent > 0 ? "+" : ""}{stock.changePercent?.toFixed(2) || "0.00"}%
                        </TableCell>
                        <TableCell>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(stock.symbol)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                    </SortableRow>
                    ))
                )}
                </TableBody>
            </SortableContext>
            </Table>
        </DndContext>
      </div>
    </div>
  );
};

export default WatchlistTable;
