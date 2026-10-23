import React from 'react';
import { PrezoAlertDetailScreen } from '../../screens/Prezo/PrezoAlertDetailScreen';
import { PrezoAlertsScreen } from '../../screens/Prezo/PrezoAlertsScreen';
import { PrezoCampaignDetailsScreen } from '../../screens/Prezo/PrezoCampaignDetailsScreen';
import { PrezoCheckoutScreen } from '../../screens/Prezo/PrezoCheckoutScreen';
import { PrezoExploreScreen } from '../../screens/Prezo/PrezoExploreScreen';
import { PrezoFallbackDecisionScreen } from '../../screens/Prezo/PrezoFallbackDecisionScreen';
import { PrezoFaqScreen } from '../../screens/Prezo/PrezoFaqScreen';
import { PrezoHelpScreen } from '../../screens/Prezo/PrezoHelpScreen';
import { PrezoHomeScreen } from '../../screens/Prezo/PrezoHomeScreen';
import { PrezoOrderConfirmationScreen } from '../../screens/Prezo/PrezoOrderConfirmationScreen';
import { PrezoOrderDetailsScreen } from '../../screens/Prezo/PrezoOrderDetailsScreen';
import { PrezoOrdersScreen } from '../../screens/Prezo/PrezoOrdersScreen';
import { PrezoPolicyScreen } from '../../screens/Prezo/PrezoPolicyScreen';
import { PrezoProfileScreen } from '../../screens/Prezo/PrezoProfileScreen';
import { PrezoReportScreen } from '../../screens/Prezo/PrezoReportScreen';
import { PrezoSellerScreen } from '../../screens/Prezo/PrezoSellerScreen';
import { PrezoSupportScreen } from '../../screens/Prezo/PrezoSupportScreen';
import { PrezoWaitlistEntryScreen } from '../../screens/Prezo/PrezoWaitlistEntryScreen';
import { PrezoWaitlistScreen } from '../../screens/Prezo/PrezoWaitlistScreen';
import type { PrezoRoute } from '../../types/prezo';

export const PrezoRouteView = ({ route }: { route: PrezoRoute }) => {
  switch (route.name) {
    case 'home':
      return <PrezoHomeScreen />;
    case 'explore':
      return <PrezoExploreScreen category={route.category} />;
    case 'me':
      return route.tab === 'wl' ? <PrezoWaitlistScreen /> : <PrezoOrdersScreen tab={route.tab} />;
    case 'profile':
      return <PrezoProfileScreen />;
    case 'campaign':
      return <PrezoCampaignDetailsScreen id={route.id} />;
    case 'seller':
      return <PrezoSellerScreen id={route.id} />;
    case 'checkout':
      return (
        <PrezoCheckoutScreen campaignId={route.campaignId} waitlistEntryId={route.waitlistEntryId} />
      );
    case 'confirmation':
      return <PrezoOrderConfirmationScreen orderId={route.orderId} />;
    case 'order':
      return <PrezoOrderDetailsScreen id={route.id} />;
    case 'fallback':
      return <PrezoFallbackDecisionScreen orderId={route.orderId} />;
    case 'waitlistEntry':
      return <PrezoWaitlistEntryScreen id={route.id} />;
    case 'alerts':
      return <PrezoAlertsScreen />;
    case 'alert':
      return <PrezoAlertDetailScreen id={route.id} />;
    case 'help':
      return <PrezoHelpScreen />;
    case 'faq':
      return <PrezoFaqScreen topic={route.topic} />;
    case 'report':
      return <PrezoReportScreen relatedId={route.relatedId} />;
    case 'support':
      return <PrezoSupportScreen />;
    default:
      return <PrezoPolicyScreen topic={route.topic} />;
  }
};

