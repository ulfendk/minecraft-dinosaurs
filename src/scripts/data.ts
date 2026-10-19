// Shape of the build-time data injected into the scripts bundle as __DINO_DATA__.
export interface GuideData {
  version: string;
  creatures: {
    id: string;
    name: string;
    info: string;
    period: string;
    diet: string;
    group: string;
    lengthM: number;
    temperament: string;
    tame: 'egg' | 'feed' | 'no';
    ride: 'ground' | 'fly' | 'swim' | null;
    seats: number;
    habitat: string;
    livesIn: string[];
  }[];
  habitats: string[];
  structures: Record<string, { name: string; size: [number, number, number]; base: [number, number, number] }[]>;
  plants: { id: string; name: string; info: string }[];
  trees: { id: string; name: string; info: string }[];
}
