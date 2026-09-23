import mongoose from 'mongoose'

async function checkAsset() {
  await mongoose.connect('mongodb://localhost:27017/nexahr')
  const Asset = mongoose.connection.collection('assets')
  const assets = await Asset.find().sort({createdAt: -1}).limit(5).toArray()
  console.log(JSON.stringify(assets, null, 2))
  process.exit(0)
}

checkAsset().catch(console.error)
