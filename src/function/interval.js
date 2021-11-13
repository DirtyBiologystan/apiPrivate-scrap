const redis = require("../services/redis");
const io = require("../services/socket.io");
const getUser = require("../services/getUser");
const flagAfter = require("../request/flagAfter");
const calculOne = require("./calculOne");

const roomNewPixel = io.to("newPixel");
const roomChange = io.to("changePixel");
const roomTotal = io.to("total");

module.exports = async ({ countPixel, date, model }) => {
  console.log("entri", { countPixel, date, model });
  let flagDatas = await flagAfter(date);
  date = new Date(Date.now() - 1000).toISOString();
  if (!flagDatas.length) {
    console.log(date, "no data change");
    await redis.set("time", date);

    return { countPixel, date, model };
  }

  flagDatas = await flagDatas.reduce(async (accu, flagData) => {
    accu = await accu;
    const pixel = await model.findOne(
      { indexInFlag: flagData.indexInFlag },
      { _id: false }
    );
    if (!pixel) {
      let pseudo = await getUser(flagData.author);
      const newPixel = {
        ...flagData,
        ...calculOne(countPixel + 1),
        index: countPixel,
        pseudo,
      };
      countPixel++;
      roomNewPixel.emit("newPixel", newPixel);
      roomTotal.emit("total", countPixel);
      accu.push({
        insertOne: {
          document: newPixel,
        },
      });
      return accu;
    }
    let pseudo = await getUser(flagData.author);
    if (flagData.hexColor !== pixel.hexColor) {
      roomChange.emit("changePixel", {
        ...pixel.toObject(),
        hexColor: flagData.hexColor,
        oldHexColor: pixel.hexColor,
        modifier: {
          author: flagData.author,
          pseudo: pseudo,
        },
      });
    }
    accu.push({
      updateOne: {
        filter: {
          indexInFlag: flagData.indexInFlag,
        },
        update: {
          $set: {
            hexColor: flagData.hexColor,
            modifier: {
              author: flagData.author,
              pseudo: pseudo,
            },
          },
        },
      },
    });
    return accu;
  }, []);
  const bulk = await model.bulkWrite(flagDatas);
  const pRedis = await redis.set("time", date);

  console.log(bulk);
  console.log("sorti", { countPixel, date, model });

  return { countPixel, date, model };
};
