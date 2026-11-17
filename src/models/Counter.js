const mongoose = require('mongoose');

const CounterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 10000 } });
const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

async function nextSeq(name) {
  const doc = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return doc.seq;
}

module.exports = { Counter, nextSeq };
