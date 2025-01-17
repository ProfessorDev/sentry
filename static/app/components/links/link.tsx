import React from 'react';
import {Link as RouterLink} from 'react-router';
import isPropValid from '@emotion/is-prop-valid';
import styled from '@emotion/styled';
import * as Sentry from '@sentry/react';
import {Location, LocationDescriptor} from 'history';
import PropTypes from 'prop-types';

type AnchorProps = React.HTMLProps<HTMLAnchorElement>;

type ToLocationFunction = (location: Location) => LocationDescriptor;

type Props = {
  //URL
  to: ToLocationFunction | LocationDescriptor;
  // Styles applied to the component's root
  className?: string;
} & Omit<AnchorProps, 'href' | 'target'>;

/**
 * A context-aware version of Link (from react-router) that falls
 * back to <a> if there is no router present
 */
class Link extends React.Component<Props> {
  static contextTypes = {
    location: PropTypes.object,
  };

  componentDidMount() {
    const isRouterPresent = this.context.location;
    if (!isRouterPresent) {
      Sentry.captureException(
        new Error('The link component was rendered without being wrapped by a <Router />')
      );
    }
  }

  render() {
    const {disabled, to, ref, ...props} = this.props;
    const isRouterPresent = this.context.location;

    if (!disabled && isRouterPresent) {
      return <RouterLink to={to} ref={ref as any} {...props} />;
    }

    if (typeof to === 'string') {
      return <Anchor href={to} ref={ref} disabled={disabled} {...props} />;
    }

    return <Anchor href="" ref={ref} {...props} disabled />;
  }
}

export default Link;

const Anchor = styled('a', {
  shouldForwardProp: prop => isPropValid(prop) && prop !== 'disabled',
})<{disabled?: boolean}>`
  ${p =>
    p.disabled &&
    `
  color:${p.theme.disabled};
  pointer-events: none;
  :hover {
    color: ${p.theme.disabled};
  }
  `};
`;
