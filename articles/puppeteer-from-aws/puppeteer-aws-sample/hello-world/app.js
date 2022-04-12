const puppeteer = require("puppeteer");

exports.lambdaHandler = async (event, context) => {
  let response;
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "-–disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
      ],
    });
    const page = await browser.newPage();
    await page.goto("http://example.com/");
    const element = await page.$("body > div > h1");
    const value = await (await element.getProperty("textContent"))?.jsonValue();

    await browser.close();
    response = {
      statusCode: 200,
      body: JSON.stringify({
        message: value,
      }),
    };
  } catch (err) {
    console.log(err);
    return err;
  }

  return response;
};
