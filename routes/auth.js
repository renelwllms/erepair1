const axios = require("axios");
const GRAPH_ME_ENDPOINT = "https://graph.microsoft.com/v1.0/me";

async function isAuthenticated(req, res, next) {
  try {
    const options = {
      headers: {
        Authorization: req?.headers?.authorization,
      },
    };
    const response = await axios.get(GRAPH_ME_ENDPOINT, options);
    if (response?.data) {
      req.info = response.data;
    }

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = isAuthenticated;
