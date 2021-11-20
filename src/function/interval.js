const redis = require("../services/redis");
const io = require("../services/socket.io");
const getUser = require("../services/getUser");
const flagAfter = require("../request/flagAfter");
const calculOne = require("./calculOne");

const roomNewPixel = io.to("newPixel");
const roomChange = io.to("changePixel");
const roomTotal = io.to("total");

module.exports = async ({ countPixel, lastIndexInFlag, date, model }) => {
  console.log("entri", { countPixel, lastIndexInFlag, date, model });
  let dateAfter = new Date().toISOString();

  let flagDatas = await flagAfter(date);
  date = dateAfter;
  if (!flagDatas.length) {
    console.log(date, "no data change");
    await redis.set("time", date);
    return { countPixel, lastIndexInFlag, date, model };
  }

  flagDatas = await flagDatas.reduce(async (accu, flagData) => {
    accu = await accu;

    if (lastIndexInFlag < flagData.indexInFlag) {
      lastIndexInFlag = flagData.indexInFlag;
      let pseudo = await getUser(flagData.author);
      const newPixel = {
        ...flagData,
        hexColor: flagData.hexColor.toUpperCase(),
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
    const pixel = await model.findOne(
      { indexInFlag: flagData.indexInFlag },
      { _id: false }
    );
    if (flagData.hexColor.toUpperCase() !== pixel.hexColor.toUpperCase()) {
      roomChange.emit("changePixel", {
        ...pixel.toObject(),
        hexColor: flagData.hexColor.toUpperCase(),
        oldHexColor: pixel.hexColor.toUpperCase(),
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
            hexColor: flagData.hexColor.toUpperCase(),
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
  await redis.set("time", date);

  console.log(bulk);
  console.log("sorti", { countPixel, lastIndexInFlag, date, model });

  return { countPixel, lastIndexInFlag, date, model };
};
