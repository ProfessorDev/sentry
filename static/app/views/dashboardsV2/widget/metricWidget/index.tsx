import React from 'react';
import {RouteComponentProps} from 'react-router';
import {components, OptionProps} from 'react-select';
import styled from '@emotion/styled';
import cloneDeep from 'lodash/cloneDeep';
import set from 'lodash/set';

import Highlight from 'app/components/highlight';
import * as Layout from 'app/components/layouts/thirds';
import GlobalSelectionHeader from 'app/components/organizations/globalSelectionHeader';
import PickProjectToContinue from 'app/components/pickProjectToContinue';
import {t} from 'app/locale';
import {PageContent} from 'app/styles/organization';
import {GlobalSelection, Organization, Project} from 'app/types';
import withGlobalSelection from 'app/utils/withGlobalSelection';
import withProjects from 'app/utils/withProjects';
import AsyncView from 'app/views/asyncView';
import SelectField from 'app/views/settings/components/forms/selectField';

import BuildStep from '../buildStep';
import BuildSteps from '../buildSteps';
import ChooseDataSetStep from '../choseDataStep';
import Header from '../header';
import {DataSet} from '../utils';

import Card from './card';
import Queries from './queries';
import {Metric, MetricQuery} from './types';

const newQuery = {
  tags: '',
  groupBy: '',
  aggregation: '',
};

type Props = RouteComponentProps<{}, {}> &
  AsyncView['props'] & {
    organization: Organization;
    projects: Project[];
    loadingProjects: boolean;
    selection: GlobalSelection;
    onChangeDataSet: (dataSet: DataSet) => void;
  };

type State = AsyncView['state'] & {
  title: string;
  metrics: Metric[];
  queries: MetricQuery[];
  metric?: Metric;
};

class MetricWidget extends AsyncView<Props, State> {
  getDefaultState() {
    return {
      ...super.getDefaultState(),
      title: t('Custom Widget'),
      metrics: [],
      queries: [{...newQuery}],
    };
  }

  get project() {
    const {projects, location} = this.props;
    const {query} = location;
    const {project: projectId} = query;

    return projects.find(project => project.id === projectId);
  }

  getEndpoints(): ReturnType<AsyncView['getEndpoints']> {
    const {organization, loadingProjects} = this.props;

    if (this.isProjectMissingInUrl() || loadingProjects || !this.project) {
      return [];
    }

    return [['metrics', `/projects/${organization.slug}/${this.project.slug}/metrics/`]];
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevProps.loadingProjects && !this.props.loadingProjects) {
      this.reloadData();
    }

    if (!prevState.metrics.length && !!this.state.metrics.length) {
      this.handleMetricChange(this.state.metrics[0]);
    }

    super.componentDidUpdate(prevProps, prevState);
  }

  handleTitleChange = (title: string) => {
    this.setState({title});
  };

  handleMetricChange = (metric: Metric) => {
    this.setState({metric, queries: [{...newQuery, aggregation: metric.operations[0]}]});
  };

  handleRemoveQuery = (index: number) => {
    this.setState(state => {
      const newState = cloneDeep(state);
      newState.queries.splice(index, index + 1);
      return newState;
    });
  };

  handleAddQuery = () => {
    this.setState(state => {
      const newState = cloneDeep(state);
      newState.queries.push(cloneDeep(newQuery));
      return newState;
    });
  };

  handleChangeQuery = (index: number, query: MetricQuery) => {
    this.setState(state => {
      const newState = cloneDeep(state);
      set(newState, `queries.${index}`, query);
      return newState;
    });
  };

  handleProjectChange = (selectedProjects: number[]) => {
    const {projects, router, location, organization} = this.props;

    const newlySelectedProject = projects.find(p => p.id === String(selectedProjects[0]));

    // if we change project in global header, we need to sync the project slug in the URL
    if (newlySelectedProject?.id) {
      router.replace({
        pathname: `/organizations/${organization.slug}/dashboards/widget/new/`,
        query: {
          ...location.query,
          project: newlySelectedProject.id,
          environment: undefined,
        },
      });
    }
  };

  isProjectMissingInUrl() {
    const projectId = this.props.location.query.project;
    return !projectId || typeof projectId !== 'string';
  }

  renderBody() {
    const {
      organization,
      router,
      projects,
      onChangeDataSet,
      selection,
      location,
      loadingProjects,
    } = this.props;
    const {title, metrics, metric, queries} = this.state;
    const orgSlug = organization.slug;

    if (loadingProjects) {
      return this.renderLoading();
    }

    const project = this.project;

    if (this.isProjectMissingInUrl() || !project) {
      return (
        <PickProjectToContinue
          router={router}
          projects={projects.map(p => ({id: p.id, slug: p.slug}))}
          nextPath={`/organizations/${orgSlug}/dashboards/widget/new/?dataSet=metrics`}
          noProjectRedirectPath={`/organizations/${orgSlug}/dashboards/`}
        />
      );
    }

    return (
      <GlobalSelectionHeader
        onUpdateProjects={this.handleProjectChange}
        disableMultipleProjectSelection
        skipLoadLastUsed
      >
        <StyledPageContent>
          <Header
            orgSlug={orgSlug}
            title={title}
            onChangeTitle={this.handleTitleChange}
          />
          <Layout.Body>
            <BuildSteps>
              <Card
                router={router}
                location={location}
                selection={selection}
                organization={organization}
                api={this.api}
                project={project}
                widget={{
                  title,
                  queries,
                  yAxis: metric?.name,
                }}
              />
              <ChooseDataSetStep value={DataSet.METRICS} onChange={onChangeDataSet} />
              <BuildStep
                title={t('Choose your y-axis metric')}
                description={t('Determine what type of metric you want to graph by.')}
              >
                <StyledSelectField
                  name="metric"
                  choices={metrics.map(m => [m, m.name])}
                  placeholder={t('Select metric')}
                  onChange={this.handleMetricChange}
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
                  inline={false}
                  flexibleControlStateSize
                  stacked
                  allowClear
                />
              </BuildStep>
              <BuildStep
                title={t('Begin your search')}
                description={t('Add another query to compare projects, tags, etc.')}
              >
                <Queries
                  organization={organization}
                  projectId={project.id}
                  metrics={metrics}
                  metric={metric}
                  queries={queries}
                  onAddQuery={this.handleAddQuery}
                  onRemoveQuery={this.handleRemoveQuery}
                  onChangeQuery={this.handleChangeQuery}
                />
              </BuildStep>
            </BuildSteps>
          </Layout.Body>
        </StyledPageContent>
      </GlobalSelectionHeader>
    );
  }
}

export default withProjects(withGlobalSelection(MetricWidget));

const StyledPageContent = styled(PageContent)`
  padding: 0;
`;

const StyledSelectField = styled(SelectField)`
  padding-right: 0;
`;
