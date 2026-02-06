import DevReturnResetDeliveryService from './DevReturnResetDeliveryService';
import SesResetDeliveryService from './SesResetDeliveryService';

export const resetDeliveryFactory = () => {
  const isProd =
    String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  const hasSes =
    !!String(process.env.SES_FROM_EMAIL || '') &&
    !!String(process.env.APP_WEB_BASE_URL || '');
  return isProd && hasSes
    ? SesResetDeliveryService
    : DevReturnResetDeliveryService;
};
