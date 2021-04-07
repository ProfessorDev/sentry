import React from 'react';
import {Link, withRouter, WithRouterProps} from 'react-router';
import styled from '@emotion/styled';
import classNames from 'classnames';
import {LocationDescriptor} from 'history';
import omit from 'lodash/omit';
import * as qs from 'query-string';

type DefaultProps = {
  index: boolean;
  activeClassName: string;
  disabled: boolean;
};

type Props = WithRouterProps &
  DefaultProps &
  React.ComponentProps<typeof Link> & {
    query?: string;
    // If supplied by parent component, decides whether link element
    // is "active" or not ... overriding default behavior of strict
    // route matching
    isActive?: (location: LocationDescriptor, indexOnly?: boolean) => boolean;
  };

class ListLink extends React.Component<Props> {
  static displayName = 'ListLink';

  static defaultProps: DefaultProps = {
    activeClassName: 'active',
    index: false,
    disabled: false,
  };

  isActive = () => {
    const {isActive, to, query, index} = this.props;

    if (typeof to !== 'string') {
      return false;
    }

    const parsedQuery = query ? qs.parse(query) : undefined;
    const activeFn = isActive ?? this.props.router.isActive;

    return activeFn({pathname: to, query: parsedQuery}, index);
  };

  getClassName = () => {
    const _classNames = {};
    const {className, activeClassName} = this.props;

    if (className) {
      _classNames[className] = true;
    }

    if (this.isActive()) {
      _classNames[activeClassName] = true;
    }

    return classNames(_classNames);
  };

  render() {
    const {index, children, to, disabled, ...props} = this.props;
    const carriedProps = omit(props, 'activeClassName', 'isActive', 'index');

    return (
      <StyledLi className={this.getClassName()} disabled={disabled}>
        <Link {...carriedProps} onlyActiveOnIndex={index} to={disabled ? '' : to}>
          {children}
        </Link>
      </StyledLi>
    );
  }
}

export default withRouter(ListLink);

const StyledLi = styled('li', {
  shouldForwardProp: prop => prop !== 'disabled',
})<{disabled?: boolean}>`
  ${p =>
    p.disabled &&
    `
   a {
    color:${p.theme.disabled} !important;
    pointer-events: none;
    :hover {
      color: ${p.theme.disabled}  !important;
    }
   }
`}
`;
