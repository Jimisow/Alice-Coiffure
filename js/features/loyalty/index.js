// API publique de la feature « loyalty » (carte fidélité à tampons).
export { renderLoyaltyCard, bindLoyaltyCard, renderMiniCard } from './loyaltyCard.js';
export {
  DEFAULT_RULES,
  OBJECTIF_MIN,
  OBJECTIF_MAX,
  getLoyaltyRules,
  saveLoyaltyRules,
  loyaltyState,
  isRewardDue,
  addStamp,
  undoStamp,
  removeLastStamp,
  restoreStamp,
  redeemReward,
  getVisitHistory,
  removeVisitsOfClient,
} from './loyaltyService.js';
