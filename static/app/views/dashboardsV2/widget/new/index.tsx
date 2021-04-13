import React from 'react';
import {RouteComponentProps} from 'react-router';

import Feature from 'app/components/acl/feature';
import Alert from 'app/components/alert';
import {t} from 'app/locale';
import {PageContent} from 'app/styles/organization';
import {Organization} from 'app/types';
import withOrganization from 'app/utils/withOrganization';

import WidgetNew from './widgetNew';

type RouteParams = {
  orgId: string;
};

type Props = RouteComponentProps<RouteParams, {}> & {
  organization: Organization;
  children: React.ReactNode;
};

function WidgetNewContainer({organization, ...props}: Props) {
  return <WidgetNew {...props} organization={organization} />;
}

export default withOrganization(WidgetNewContainer);
