export type Metric = {
  name: string;
  type: string;
  operations: string[];
  // tags: string[];
  unit: string | null;
};

export type MetricQuery = {
  legend?: string;
  groupBy?: string[];
  metric?: Metric;
  aggregation?: string;
  tags?: string;
};

export type MetricWidget = {
  title: string;
  queries: MetricQuery[];
  yAxis?: string;
  id?: string;
};
