
import { useState, useCallback } from 'react';
import { YEARS, SEGMENTS, ZEROS_5 } from '../constants';
import type { AppState, Segment, FWMonth, SocialMonth, WeeklyData, LandingPageData } from '../types';
import { parseBRNumber } from '../utils/helpers';
import { stateToWorkbook, workbookToState } from '../utils/excel';
import * as XLSX from 'xlsx';

const defaultFWMonth = (): FWMonth => ({
  weeks: 5,
  organic: {
    sources: { "Google": ZEROS_5(), "Bing": ZEROS_5(), "Site": ZEROS_5() },
    landing: { "LP Principal": { leads: ZEROS_5(), views: ZEROS_5() } }
  },
  paid: {
    meta: { investimento: ZEROS_5(), alcance: ZEROS_5(), impressoes: ZEROS_5(), cliques: ZEROS_5(), leadsPlan: ZEROS_5(), leads: ZEROS_5() },
    google: { investimento: ZEROS_5(), alcance: ZEROS_5(), impressoes: ZEROS_5(), cliques: ZEROS_5(), leadsPlan: ZEROS_5(), leads: ZEROS_5() }
  },
  pipe: { leads: ZEROS_5(), oportunidades: ZEROS_5(), noShow: ZEROS_5(), perdidos: ZEROS_5(), vendas: ZEROS_5() }
});

const defaultSocialMonth = (): SocialMonth => ({
  weeks: 5,
  metrics: ["Alcance", "Impressões", "Cliques"],
  networks: {
    "Instagram": { "Alcance": ZEROS_5(), "Impressões": ZEROS_5(), "Cliques": ZEROS_5() },
    "Facebook": { "Alcance": ZEROS_5(), "Impressões": ZEROS_5(), "Cliques": ZEROS_5() }
  }
});

const generateInitialData = () => {
  const data: any = {};
  SEGMENTS.forEach(segment => {
    data[segment] = {};
    YEARS.forEach(year => {
      if (segment === 'Redes Sociais') {
        data[segment][year] = Array.from({ length: 12 }, defaultSocialMonth);
      } else {
        data[segment][year] = Array.from({ length: 12 }, defaultFWMonth);
      }
    });
  });
  return data;
};

const useDashboardState = () => {
  const now = new Date();
  const currentYear = YEARS.includes(now.getFullYear()) ? now.getFullYear() : YEARS[0];
  const currentMonth = now.getMonth();

  const [state, setState] = useState<AppState>({
    year: currentYear,
    month: currentMonth,
    segment: 'Franquias',
    mode: 'weekly',
    data: generateInitialData(),
  });

  const updateState = useCallback(<T,>(key: keyof AppState, value: T) => {
    setState(prevState => ({ ...prevState, [key]: value }));
  }, []);
  
  const updateNestedState = (updateFn: (draft: AppState) => void) => {
    setState(prevState => {
        const newState = JSON.parse(JSON.stringify(prevState));
        updateFn(newState);
        return newState;
    });
  };

  const setYear = (year: number) => updateState('year', year);
  const setMonth = (month: number) => updateState('month', month);
  const setSegment = (segment: Segment) => updateState('segment', segment);
  const toggleMode = () => updateState('mode', state.mode === 'weekly' ? 'annual' : 'weekly');

  const updateFwMetric = (
    area: 'organic' | 'paid' | 'pipe',
    subArea: string,
    metric: string,
    weekIndex: number,
    value: number,
    subMetric?: 'leads' | 'views'
  ) => {
      updateNestedState(draft => {
          const monthData = draft.data[draft.segment][draft.year][draft.month] as FWMonth;
          if (area === 'organic' && subArea === 'landing' && subMetric) {
             (monthData.organic.landing[metric] as LandingPageData)[subMetric][weekIndex] = value;
          } else if(area === 'organic' && subArea === 'sources'){
             (monthData.organic.sources[metric] as WeeklyData)[weekIndex] = value;
          } else if (area === 'paid') {
              (monthData.paid[subArea as 'meta' | 'google'] as any)[metric][weekIndex] = value;
          } else if (area === 'pipe') {
              (monthData.pipe as any)[metric][weekIndex] = value;
          }
      });
  };

  const addFwItem = (area: 'sources' | 'landing', name: string) => {
      updateNestedState(draft => {
          const monthData = draft.data[draft.segment][draft.year][draft.month] as FWMonth;
          if (area === 'sources' && !monthData.organic.sources[name]) {
              monthData.organic.sources[name] = ZEROS_5();
          } else if (area === 'landing' && !monthData.organic.landing[name]) {
              monthData.organic.landing[name] = { leads: ZEROS_5(), views: ZEROS_5() };
          }
      });
  };

  const removeFwItem = (area: 'sources' | 'landing', name: string) => {
      updateNestedState(draft => {
          const monthData = draft.data[draft.segment][draft.year][draft.month] as FWMonth;
          if (area === 'sources') {
              delete monthData.organic.sources[name];
          } else if (area === 'landing') {
              delete monthData.organic.landing[name];
          }
      });
  };
  
  const updateSocialMetric = (network: string, metric: string, weekIndex: number, value: string) => {
    updateNestedState(draft => {
      const socialData = draft.data['Redes Sociais'][draft.year][draft.month] as SocialMonth;
      if (socialData.networks[network] && socialData.networks[network][metric]) {
        socialData.networks[network][metric][weekIndex] = parseBRNumber(value);
      }
    });
  };

  const addSocialNetwork = (name: string) => {
    updateNestedState(draft => {
      const socialData = draft.data['Redes Sociais'][draft.year][draft.month] as SocialMonth;
      if (!socialData.networks[name]) {
        socialData.networks[name] = Object.fromEntries(socialData.metrics.map(m => [m, ZEROS_5()]));
      }
    });
  };
  
  const removeSocialNetwork = (name: string) => {
    updateNestedState(draft => {
      const socialData = draft.data['Redes Sociais'][draft.year][draft.month] as SocialMonth;
      delete socialData.networks[name];
    });
  };

  const addSocialMetric = (name: string) => {
    updateNestedState(draft => {
      const socialData = draft.data['Redes Sociais'][draft.year][draft.month] as SocialMonth;
      if (!socialData.metrics.includes(name)) {
        socialData.metrics.push(name);
        Object.keys(socialData.networks).forEach(net => {
          socialData.networks[net][name] = ZEROS_5();
        });
      }
    });
  };
  
  const removeSocialMetric = (name: string) => {
    updateNestedState(draft => {
      const socialData = draft.data['Redes Sociais'][draft.year][draft.month] as SocialMonth;
      socialData.metrics = socialData.metrics.filter(m => m !== name);
      Object.keys(socialData.networks).forEach(net => {
        delete socialData.networks[net][name];
      });
    });
  };

  const exportState = () => {
    const wb = stateToWorkbook(state);
    XLSX.writeFile(wb, `camerite-dashboard-data.xlsx`);
  };

  const importState = async (file: File) => {
    try {
      const newState = await workbookToState(file, state);
      setState(newState);
    } catch (error) {
      console.error(error);
      alert('Erro ao importar o arquivo XLSX. Verifique se o formato está correto.');
    }
  };

  return {
    state,
    setYear,
    setMonth,
    setSegment,
    toggleMode,
    updateFwMetric,
    addFwItem,
    removeFwItem,
    updateSocialMetric,
    addSocialNetwork,
    removeSocialNetwork,
    addSocialMetric,
    removeSocialMetric,
    exportState,
    importState
  };
};

export default useDashboardState;
