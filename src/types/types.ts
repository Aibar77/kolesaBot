export interface ICar {
  name: string;
  CarId: number;
  year: number;
  price: number;
  viewed: number;
  city: string;
  generation: string;
  carBody: string;
  engineCapacity: string;
  mileage?: number | string;
  transmission: string;
  drive: string;
  wheel: string;
  color?: string;
  clearanceInKz: string;
}