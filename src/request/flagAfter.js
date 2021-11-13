const https = require("https");

module.exports = async (date) =>
  new Promise((resolve, reject) => {
    console.log(`${process.env.URL_FLAG}/flag/after/${date}`);
    https.get(
      `${process.env.URL_FLAG}/flag/after/${date}`,
      (reqToFoulo) => {
        reqToFoulo.setEncoding("utf8");
        reqToFoulo.on("error", (err) => {
          reject(err);
        });
        let rawData = "";
        reqToFoulo.on("data", (chunk) => {
          rawData += chunk;
        });
        reqToFoulo.on("end", () => {
          let parsedData;
          try {
            parsedData = JSON.parse(rawData);
            resolve(parsedData);
          } catch (e) {
            console.log(rawData);
            reject(e);
            return;
          }
        });
      }
    );
  });
