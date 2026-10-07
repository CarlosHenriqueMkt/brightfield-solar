import type { CityConfig } from '@/domain/cities/city-config';

export type SimDrawerStep = 'bill' | 'coverage' | 'result' | 'edit';

export interface SimDrawerValues {
  readonly bill: string;
  readonly coverage: string;
}

export interface SimPresentationResult {
  readonly panelCount: string;
  readonly investment: string;
  readonly monthlySavings: string;
  readonly payback: string;
}

export interface SimDrawerProps {
  readonly id: string;
  readonly open: boolean;
  readonly step: SimDrawerStep;
  readonly values: SimDrawerValues;
  readonly profiles: CityConfig['householdProfiles'];
  readonly selectedProfile: number | null;
  readonly result: SimPresentationResult;
  readonly notices: readonly string[];
  readonly stateIncentiveNote: CityConfig['stateIncentiveNote'];
  readonly explanation: string;
  readonly installationHref: string;
  readonly modal?: boolean;
  readonly keepMounted?: boolean;
  readonly liveSummary?: string;
  readonly closeLabel?: string;
  readonly onInstallation?: () => void;
  readonly onViewHouse?: () => void;
  readonly onBillChange: (value: string) => void;
  readonly onCoverageChange: (value: string) => void;
  readonly onProfileSelect: (index: number) => void;
  readonly onStepChange: (step: SimDrawerStep) => void;
  readonly onOpenChange: (open: boolean) => void;
}
