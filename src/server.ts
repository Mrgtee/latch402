import "dotenv/config";

import { createApp } from "./app.js";
import { getConfig } from "./config.js";
import { logger } from "./logger.js";

const config = getConfig();
const app = createApp();

app.listen(config.port, () => {
  logger.info({ port: config.port }, "latch402 listening");
});

