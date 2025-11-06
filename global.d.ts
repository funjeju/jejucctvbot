// Google Maps API global type declarations
declare global {
  interface Window {
    google?: {
      maps?: {
        Map: any;
        Marker: any;
        InfoWindow: any;
        MapTypeId: any;
        places?: {
          PlacesService: any;
          PlacesServiceStatus: any;
        };
        SymbolPath: any;
        Geocoder: any;
      };
    };
  }
}

export {};