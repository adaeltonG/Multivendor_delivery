/* eslint-disable react-hooks/exhaustive-deps */
import Geocode from "react-geocode";
import ConfigurableValues from "../config/constants";

export default function useLocation() {
  const { GOOGLE_MAPS_KEY } = ConfigurableValues();

  if (GOOGLE_MAPS_KEY) {
    Geocode.setApiKey(GOOGLE_MAPS_KEY);
  }
  Geocode.setLanguage("en");
  Geocode.enableDebug(false);

  const coordinateLabel = (latitude, longitude) =>
    `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`;

  const latLngToGeoString = async ({ latitude, longitude }) => {
    if (!GOOGLE_MAPS_KEY) {
      return coordinateLabel(latitude, longitude);
    }
    const location = await Geocode.fromLatLng(latitude, longitude);
    return location.results[0].formatted_address;
  };

  const getCurrentLocation = (callback) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        if (!GOOGLE_MAPS_KEY) {
          callback(null, {
            label: "Current location",
            latitude,
            longitude,
            deliveryAddress: coordinateLabel(latitude, longitude),
          });
          return;
        }

        try {
          const location = await Geocode.fromLatLng(latitude, longitude);
          callback(null, {
            label: "Home",
            latitude,
            longitude,
            deliveryAddress: location.results[0].formatted_address,
          });
        } catch (error) {
          callback(error instanceof Error ? error.message : String(error));
        }
      },
      (error) => {
        callback(error.message || String(error));
        console.log(error.message);
      }
    );
  };
  return {
    getCurrentLocation,
    latLngToGeoString,
  };
}
