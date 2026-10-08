import { getCityDisplayName, type CityConfig } from './city-config';
import { SITE_NAME } from '../site';

export function cityTitle(city: CityConfig): string {
  return `Solar in ${getCityDisplayName(city)}, ${city.state} | ${SITE_NAME}`;
}

export function cityDescription(city: CityConfig): string {
  return city.designation.kind === 'demo'
    ? `${getCityDisplayName(city)}. ${city.designation.notice}`
    : `Explore residential solar in ${city.city}, ${city.stateFull}, with local information for the ${city.metroArea} area. Fictional challenge project.`;
}
