const http = require("http");

module.exports = (author) => {
  return new Promise((resolve, reject) => {
    http.get(`http://back:8000/users/${author}`, (req) => {
      req.setEncoding("utf8");
      req.on("error", (err) => {
        reject(err);
      });
      if (req.statusCode === 403) {
        resolve("");
      } else {
        let rawData = "";
        req.on("data", (chunk) => {
          rawData += chunk;
        });
        req.on("end", () => {
          try {
            let parsedData;
            parsedData = JSON.parse(rawData);
            resolve(parsedData.last_name);
          } catch (e) {
            console.log(e);
            console.log(rawData);
            reject(e);
            return;
          }
        });
      }
    });
  });
};
