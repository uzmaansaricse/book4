import mongoose from "mongoose";

const bookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    price: { type: Number, required: true },
    offerPrice: { type: Number, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: ["New", "Old", "All"], default: "New" },
    bookImage: { type: String, required: true },
}, { timestamps: true }); 

const Book = mongoose.model("Book", bookSchema);
export { Book };
