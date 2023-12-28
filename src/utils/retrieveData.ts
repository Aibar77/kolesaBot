import cheerio from "cheerio";
import { ICar } from "../types/types";


function extractNameAndYear(title: string) {
  if (title) {
    const pattern = /^([\s\S]+)\s*(\d{4})\s*г\./

      ;
    let info = pattern.exec(title);
    if (info) {
      let name = info[1].trim();
      let year = Number(info[2]);
      return { name, year };
    }
  } else {
    return {
      name: "неизвестно",
      year: "неизвестно",
    };
  }
}

function fromRuToEng(name: string) {
  let eng;
  switch (name) {
    case "Город":
      eng = "city";
      break;
    case "Поколение":
      eng = "generation";
      break;
    case "Кузов":
      eng = "carBody";
      break;
    case "Объем двигателя, л":
      eng = "engineCapacity";
      break;
    case "Пробег":
      eng = "mileage";
      break;
    case "Коробка передач":
      eng = "transmission";
      break;
    case "Привод":
      eng = "drive";
      break;
    case "Руль":
      eng = "wheel";
      break;
    case "Цвет":
      eng = "color";
      break;
    case "Растаможен в Казахстане":
      eng = "clearanceInKz";
    default:
      break;
  }
  return eng;
}


export const retrieveData = (content: string, linkId: string, view: number): ICar => {
  const $ = cheerio.load(content);
  const offer_parameters: ICar = {
    name: "неизвестно",
    CarId: +linkId,
    year: 2023,
    viewed: view,
    price: 0,
    city: "Алматы",
    generation: "неизвестно",
    carBody: "неизвестно",
    engineCapacity: "неизвестно",
    mileage: "неизвестно",
    transmission: "неизвестно",
    drive: "неизвестно",
    wheel: "неизвестно",
    color: "неизвестно",
    clearanceInKz: "неизвестно",
  };
  // offer_parameters["viewed"] = +$(".offer__container .offer__info-views .nb-views strong").text()
  // console.log(offer_parameters["viewed"])
  // offer_parameters["carID"] = carID;
  const nameAndYear = extractNameAndYear($("main .offer .offer__title").text().trim());
  if (nameAndYear) {
    offer_parameters["name"] =
      nameAndYear.name;
    offer_parameters["year"] =
      +nameAndYear.year;
  }
  offer_parameters["price"] =
    parseInt(
      $(".offer__container .offer__price").text().replace(/\n|\s/g, "")
    )
  // offer_parameters["tags"] =
  //   createTags($(".offer__description p").text().trim()) || "неизвестно";
  // offer_parameters["imgSrc"] =
  //   $(".offer__gallery img").attr("src") || "неизвестно";
  const parametersContainer = $("section.offer__container .offer__parameters");
  const parameters = parametersContainer.children("dl");

  for (let i = 0; i < parameters.length; i++) {
    const parameters_key = fromRuToEng(`${parameters.eq(i).find(".value-title").text().trim()}`);
    if (parameters_key !== undefined) {
      (offer_parameters as any)[
        parameters_key
      ] = parameters.eq(i).find(".value").text().trim();

    }
  }
  if (offer_parameters["mileage"] && typeof offer_parameters["mileage"] === "string") {
    offer_parameters["mileage"] = Number(
      offer_parameters["mileage"].replace(/\D/g, "")
    );
  }

  return offer_parameters;
};
