export interface PublicRestaurantDetailsResponse {
  restaurant: any;
  discounts: Array<{
    startTime: string;
    endTime: string;
    discountPercentage: number;
  }>;
  reviews: any[];
  rating: {
    average: number;
    total: number;
  };
  distance: number | null;
}

export interface PublicRestaurantSummary {
  _id: any;
  name: string;
  category: any;
  image: string | null;
  discounts: Array<{
    startTime: string;
    endTime: string;
    discountPercentage: number;
  }>;
  rating: {
    average: number;
    total: number;
  };
  distance: number | null;
}

export interface PublicRestaurantsListResponse {
  data: PublicRestaurantSummary[];
  total: number;
}
