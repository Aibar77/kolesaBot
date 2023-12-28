import axios from "axios";

export const getCarsViewsById = async (
  carIds: string[]
): Promise<{
  [key: string]: number;
}> => {
  const response = await axios.get(`https://kolesa.kz/ms/views/kolesa/live/${carIds.join(",")}/`, {
    headers: {
      Referer: "https://kolesa.kz/cars/?page=1000",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Sec-Ch-Ua":
        'Not_A Brand";v="8", "Chromium";v="120, "Google Chrome";v="120"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": "Windows",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
    },
  });
  const data = response.data.data;

  const result: {
    [key: string]: number;
  } = {};

  for (const id of carIds) {
    if (data[id].nb_views < 150) {
      result[id] = data[id].nb_views;

    } else {
      continue;
    }
  }

  return result;
};
