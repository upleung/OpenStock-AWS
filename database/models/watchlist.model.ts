import { Schema, model, models } from "mongoose";

const WatchlistSchema = new Schema({
  userId: { type: String, required: true },
  symbol: { type: String, required: true },
  category: { 
    type: String, 
    default: "默认列表" 
  },
  order: { 
    type: Number, 
    default: 0 
  },
  addedAt: { type: Date, default: Date.now },
});

const Watchlist = models.Watchlist || model("Watchlist", WatchlistSchema);

export default Watchlist;
