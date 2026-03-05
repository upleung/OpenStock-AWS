import { Schema, model, models } from "mongoose";

const WatchlistSchema = new Schema({
  userId: { type: String, required: true },
  symbol: { type: String, required: true },
  // 👇 --- 新增下面这两个核心字段 --- 👇
  category: { 
    type: String, 
    default: "默认列表" // 默认把之前没分类的股票放进这里
  },
  order: { 
    type: Number, 
    default: 0 
  },
  // 👆 ---------------------------- 👆
  addedAt: { type: Date, default: Date.now },
});

// 防止 Next.js 热更新时重复编译模型
const Watchlist = models.Watchlist || model("Watchlist", WatchlistSchema);

export default Watchlist;
