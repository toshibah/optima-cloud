
import { Tier } from '../components/PricingTiers';

// 1. DEFINE TYPES
export type AppStatus = 'initial' | 'pendingPayment' | 'awaitingPaymentConfirmation' | 'analyzing' | 'complete' | 'error';

export interface AnalysisParams {
  provider: string;
  budget: string;
  services: string;
}

export interface State {
  status: AppStatus;
  selectedTier: Tier | null;
  billingFile: File | null;
  analysisResult: string;
  errorMessage: string;
  pendingParams: AnalysisParams | null;
  lastAnalysisParams: AnalysisParams | null;
}

export type Action =
  | { type: 'SELECT_TIER'; payload: Tier }
  | { type: 'SET_FILE'; payload: File | null }
  | { type: 'SUBMIT_PARAMETERS'; payload: AnalysisParams }
  | { type: 'CANCEL_PAYMENT' }
  | { type: 'PROCEED_TO_PAYMENT' }
  | { type: 'START_ANALYSIS' }
  | { type: 'ANALYSIS_SUCCESS'; payload: { result: string; params: AnalysisParams } }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET' }
  | { type: 'RERUN' };
  

// 2. DEFINE INITIAL STATE
export const initialState: State = {
  status: 'initial',
  selectedTier: null,
  billingFile: null,
  analysisResult: '',
  errorMessage: '',
  pendingParams: null,
  lastAnalysisParams: null,
};


// 3. CREATE THE REDUCER
export function appReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SELECT_TIER':
      return { ...state, selectedTier: action.payload };

    case 'SET_FILE':
      return { ...state, billingFile: action.payload };

    case 'SUBMIT_PARAMETERS':
      return { ...state, pendingParams: action.payload, status: 'pendingPayment' };

    case 'CANCEL_PAYMENT':
      return { ...state, status: 'initial', pendingParams: null };

    case 'PROCEED_TO_PAYMENT':
      return { ...state, status: 'awaitingPaymentConfirmation' };

    case 'START_ANALYSIS':
      return { ...state, status: 'analyzing', errorMessage: '', analysisResult: '' };

    case 'ANALYSIS_SUCCESS':
      return {
        ...state,
        status: 'complete',
        analysisResult: action.payload.result,
        lastAnalysisParams: action.payload.params,
      };

    case 'SET_ERROR':
      return { ...state, status: 'error', errorMessage: action.payload };

    case 'RESET':
      // Reset everything, including the saved context
      return { ...initialState };
    
    case 'RERUN':
      // Reset for a new analysis but keep the last used parameters
      return {
        ...initialState,
        lastAnalysisParams: state.lastAnalysisParams,
      };

    default:
      return state;
  }
}