
import { Telegraf, Context } from "telegraf";
import axios from "axios";
import cheerio from "cheerio";
import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
// import puppeteer from "puppeteer";
import mongoose from "mongoose";
import { Schema, model } from "mongoose";
import cron from "node-cron";
import { retrieveData } from "./utils/retrieveData.js";
import { ICar } from "./types/types.js";
import { getCarsViewsById } from "./utils/getCarsViews.js";
import "dotenv/config"
// const ProxyHost = "46.101.124.11";
// const ProxyPort = "8046";
// const ProxyAuth = {
//   username: "test",
//   password: "test"
// };

// подключаюсь к редис для bullmq
const connection = new Redis({
  maxRetriesPerRequest: null
});
// создаю очередь в bullmq
const queue = new Queue("kolesaTask", { connection });
// подключаюсь к локальному mongoDB
mongoose.connect("mongodb://localhost:27017")
const carSchema = new Schema<ICar>({
  name: String,
  CarId: Number,
  year: Number,
  price: Number,
  viewed: Number,
  city: String,
  generation: String,
  carBody: String,
  engineCapacity: String,
  mileage: Number,
  transmission: String,
  drive: String,
  wheel: String,
  color: String,
  clearanceInKz: String,
})
const carModel = model("kolesaDB", carSchema)

// подключаю телеграм бот
const bot = new Telegraf(process.env.TELEGRAM_TOKEN as string);


const getLinkIDs = async (city: string, page: number): Promise<string[]> => {

  let url;
  if (page === 1) {
    url = `https://kolesa.kz/cars/${city}/`
  } else {
    url = `https://kolesa.kz/cars/${city}/?page=${page}`
  }
  const response = await axios.get(url);
  const html = response.data;
  const $ = cheerio.load(html)
  const allCars = Array.from($(".a-card"));
  let result: string[] = [];
  allCars.forEach((car) => {
    const dataId = $(car).attr("data-id");
    if (typeof dataId === "string") {
      result.push(dataId)
    }
  })
  // console.log(result)

  return result;
}
// getLinkIDs("almaty", 2)
// ({id: 2334484842,viewed: 123}) => обьект с полным инфо об машине
const getData = async (linkId: string, view: number): Promise<ICar | undefined> => {
  try {
    const response = await axios.get(`https://kolesa.kz/a/show/${linkId}`
    );
    const content = response.data;
    const dataObj: ICar = retrieveData(content, linkId, view);
    // console.log(dataObj)

    return dataObj;

  } catch (error: any) {
    console.error('Error in getData():', error.message);
  }




}
// getData("163684245", 100)
// проверка на нахождение в mongodb
// true если есть в DB
const checkDB = async (id: string): Promise<boolean> => {
  const exists = await carModel.exists({ CarId: +id });
  // console.log(exists ? true : false)

  return exists ? true : false;
}
// checkDB("163684244")
// добавляет машины в MongoDB
const addToDB = async (data: ICar): Promise<void> => {
  await carModel.create(data)
  console.log("car is added!")

}
// addToDB({
//   name: 'Honda Civic',
//   CarId: 163684245,
//   year: 1995,
//   viewed: 100,
//   price: 900000,
//   city: 'Алматы',
//   generation: '1987 - 1996 4 поколение (EC/ED/EE)',
//   carBody: 'универсал',
//   engineCapacity: '1.6 (бензин)',
//   mileage: 0,
//   transmission: 'автомат',
//   drive: 'передний привод',
//   wheel: 'справа',
//   color: 'неизвестно',
//   clearanceInKz: 'Да'
// })
// проверяет id машины и если нет в базе добавляет и возвращает массив новых машин

const getNewCars = async (readyIdandViewsObj: {
  [key: string]: number;
}): Promise<ICar[]> => {
  const newCars: ICar[] = [];
  for (const key in readyIdandViewsObj) {
    const dataObj = await getData(key, readyIdandViewsObj[key]);
    if (dataObj) {
      const exists = await checkDB(key);
      if (!exists) {
        newCars.push(dataObj)
        await addToDB(dataObj)
      }

    }
  }
  // console.log(newCars);

  return newCars;
}
// getNewCars({
//   "158668535": 100,
//   "163430641": 102
// })
// берет массив обьектов машин и отправляет сообщение
const sendMessages = async (newCars: ICar[], userId?: number): Promise<void> => {
  for (const car of newCars) {

    const msg = `${car.name} - ${car.year} года\n
       Просмотрено: ${car.viewed} раз \n
    \n Цена: ${car.price} тг \n
       Город: ${car.city} \n
       Поколение: ${car.generation} \n
       Кузов: ${car.carBody} \n
       Обьем двигателя, л: ${car.engineCapacity} \n
       Пробег: ${car.mileage ? car.mileage + " км" : "не указан"} \n
       Коробка передач: ${car.transmission} \n
       Привод: ${car.drive} \n
       Руль: ${car.wheel} \n
       Цвет: ${car.color ? car.color : "не указан"} \n
      Растаможен в Казахстане: ${car.clearanceInKz}
      `
    if (userId) {

      await bot.telegram.sendMessage(userId, msg)
    } else {
      await bot.telegram.sendMessage("518721403", msg)
    }
  }
}

const processTask = async (job: Job) => {
  const { city, page, userId } = job.data;
  const linkIds = await getLinkIDs(city, page);
  const readyIdandViewsObj = await getCarsViewsById(linkIds)
  const newCars = await getNewCars(readyIdandViewsObj);
  await sendMessages(newCars, userId);
};
const createTasks = async (cities: string[], userId?: number): Promise<void> => {
  for (const city of cities) {
    for (let page = 1; page <= 5; page++) {
      await queue.add("kolesaTask", { city, page, userId })
    }
  }
}

async function main(userId?: number) {
  const cities = ["almaty", "astana", "shymkent"];
  const worker = new Worker("kolesaTask", processTask, { connection, autorun: false })
  worker.run()
  worker.on("completed", job => {
    console.log(`${job.id} has completed!`)

  })
  worker.on("failed", (job, error) => {
    if (job) {

      console.log(`${job.id} has failed in : ${error}`)
    }
  })
  await createTasks(cities, userId);
}
main();
// bot.command("start", async (ctx) => {
//   bot.telegram.sendMessage(ctx.chat.id, `Здравствуйте ${ctx.from.first_name}!`)
//   main(ctx.chat.id)
// })
// cron.schedule("*/5 * * * *", () => {
//   main()
// })



// bot.on("message", (ctx) => {
//   const userId: number = ctx.message?.from.id;
//   main(userId)
//   cron.schedule("*/5 * * * *", () => {
//     main(userId)
//   })

// })






bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
