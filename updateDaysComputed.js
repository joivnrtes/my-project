const mongoose = require("mongoose");
const User = require("./models/User"); // 确保路径正确

async function updateAllUsers() {
  try {
    // ✅ 替换你的 MongoDB Atlas 连接字符串
    await mongoose.connect("mongodb+srv://a2487612091:tjGqBuj2z42X0Bvz@myvercelcluster.f7zii.mongodb.net/mydatabase?retryWrites=true&w=majority&appName=MyVercelCluster", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("📡 连接 MongoDB Atlas 成功！");
    
    console.log("⏳ 开始更新 `daysComputed`...");
    const result = await User.updateMany({}, [
      {
        $set: {
          daysComputed: {
            $floor: {
              $divide: [{ $subtract: [new Date(), "$createdAt"] }, 1000 * 60 * 60 * 24],
            },
          },
        },
      },
    ]);

    console.log(`✅ ${result.modifiedCount} 个用户的 \`daysComputed\` 已更新！`);
  } catch (error) {
    console.error("❌ 更新失败：", error);
  } finally {
    mongoose.connection.close();
    console.log("🔌 MongoDB 连接已关闭！");
  }
}

updateAllUsers().catch(console.error);
