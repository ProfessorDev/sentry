import React from 'react';
import {components, OptionProps} from 'react-select';
import styled from '@emotion/styled';

import SelectControl from 'app/components/forms/selectControl';
import Highlight from 'app/components/highlight';
import {t} from 'app/locale';
import SelectField from 'app/views/settings/components/forms/selectField';

import {Metric} from './types';

type Props = {
  metrics: Metric[];
  metric?: Metric;
  aggregation?: Metric['operations'][0];
  onChange: <F extends keyof Pick<Props, 'metric' | 'aggregation'>>(
    field: F,
    value: Props[F]
  ) => void;
};

function MetricSelectField({metrics, metric, aggregation, onChange}: Props) {
  return (
    <Wrapper>
      <StyledSelectField
        name="metric"
        choices={metrics.map(m => [m, m.name])}
        placeholder={t('Select metric')}
        onChange={v => onChange('metric', v)}
        value={metric}
        components={{
          Option: ({
            label,
            ...optionProps
          }: OptionProps<{
            label: string;
            value: string;
          }>) => {
            const {selectProps} = optionProps;
            const {inputValue} = selectProps;

            return (
              <components.Option label={label} {...optionProps}>
                <Highlight text={inputValue ?? ''}>{label}</Highlight>
              </components.Option>
            );
          },
        }}
        styles={{
          control: provided => ({
            ...provided,
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
            borderRight: 'none',
          }),
        }}
        inline={false}
        flexibleControlStateSize
        stacked
        allowClear
      />
      <StyledSelectControl
        name="aggregation"
        placeholder={t('Aggregation')}
        disabled={!metric?.operations.length}
        options={metric?.operations.map(operation => [operation, operation])}
        value={aggregation}
        onChange={v => onChange('aggregation', v)}
        styles={{
          control: provided => ({
            ...provided,
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
          }),
        }}
      />
    </Wrapper>
  );
}

export default MetricSelectField;

const StyledSelectField = styled(SelectField)`
  padding-right: 0;
  padding-bottom: 0;
`;

const Wrapper = styled('div')`
  display: grid;
  grid-template-columns: 1fr 0.5fr;
`;

const StyledSelectControl = styled(SelectControl)``;
