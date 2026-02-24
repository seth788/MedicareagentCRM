// Minimal types for Google Maps Places used by AddressAutocomplete
export interface GooglePlaceAddress {
  address: string;
  city: string;
  county: string;
  state: string;
  zip: string;
}

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text?: string;
  };
}

declare global {
  const google: {
    maps: {
      event?: { clearInstanceListeners: (instance: unknown) => void };
      places: {
        AutocompleteService: new () => {
          getPlacePredictions(
            request: { input: string; types?: string[] },
            callback: (predictions: PlacePrediction[] | null, status: string) => void
          ): void;
        };
        PlacesService: new (div: HTMLDivElement) => {
          getDetails(
            request: { placeId: string; fields?: string[] },
            callback: (
              place: { address_components?: Array<{ long_name: string; short_name: string; types: string[] }>; formatted_address?: string } | null,
              status: string
            ) => void
          ): void;
        };
      };
    };
  };
}
