import React from 'react';

import withOrganization from 'app/utils/withOrganization';

import WidgetNew from './widgetNew';

type Props = React.ComponentProps<typeof WidgetNew>;

function WidgetNewContainer({organization, ...props}: Props) {
  return <WidgetNew {...props} organization={organization} />;
}

export default withOrganization(WidgetNewContainer);
