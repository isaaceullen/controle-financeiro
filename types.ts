
export type WeeklyData = (number | string)[];

export type Segment = 'Franquias' | 'White Label' | 'Redes Sociais';

export interface LandingPageData {
  leads: WeeklyData;
  views: WeeklyData;
}

export interface OrganicData {
  sources: { [key: string]: WeeklyData };
  landing: { [key: string]: LandingPageData };
}

export interface PaidChannelData {
  investimento: WeeklyData;
  alcance: WeeklyData;
  impressoes: WeeklyData;
  cliques: WeeklyData;
  leadsPlan: WeeklyData;
  leads: WeeklyData;
}

export interface PaidData {
  meta: PaidChannelData;
  google: PaidChannelData;
}

export interface PipeData {
  leads: WeeklyData;
  oportunidades: WeeklyData;
  noShow: WeeklyData;
  perdidos: WeeklyData;
  vendas: WeeklyData;
}

export interface FWMonth {
  weeks: number;
  organic: OrganicData;
  paid: PaidData;
  pipe: PipeData;
}

export interface SocialNetworkData {
  [metric: string]: WeeklyData;
}

export interface SocialMonth {
  weeks: number;
  metrics: string[];
  networks: {
    [network: string]: SocialNetworkData;
  };
}

export type MonthlyData = FWMonth | SocialMonth;

export interface YearData {
  [year: number]: MonthlyData[];
}

export interface SegmentData {
  'Franquias': YearData;
  'White Label': YearData;
  'Redes Sociais': YearData;
}

export interface AppState {
  year: number;
  month: number;
  segment: Segment;
  mode: 'weekly' | 'annual';
  data: SegmentData;
}

export interface SupabaseConfig {
  url: string;
  key: string;
  dashboardId: string;
}
