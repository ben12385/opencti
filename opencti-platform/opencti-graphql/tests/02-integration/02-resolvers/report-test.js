import gql from 'graphql-tag';
import { queryAsAdmin } from '../../utils/testQuery';
import { now } from '../../../src/database/grakn';
import { elLoadByStixId } from '../../../src/database/elasticSearch';

const LIST_QUERY = gql`
  query reports(
    $first: Int
    $after: ID
    $orderBy: ReportsOrdering
    $orderMode: OrderingMode
    $filters: [ReportsFiltering]
    $filterMode: FilterMode
    $search: String
  ) {
    reports(
      first: $first
      after: $after
      orderBy: $orderBy
      orderMode: $orderMode
      filters: $filters
      filterMode: $filterMode
      search: $search
    ) {
      edges {
        node {
          id
          name
          description
          published
        }
      }
    }
  }
`;

const TIMESERIES_QUERY = gql`
  query reportsTimeSeries(
    $objectId: String
    $authorId: String
    $field: String!
    $operation: StatsOperation!
    $startDate: DateTime!
    $endDate: DateTime!
    $interval: String!
  ) {
    reportsTimeSeries(
      objectId: $objectId
      authorId: $authorId
      field: $field
      operation: $operation
      startDate: $startDate
      endDate: $endDate
      interval: $interval
    ) {
      date
      value
    }
  }
`;

const NUMBER_QUERY = gql`
  query reportsNumber($objectId: String, $endDate: DateTime!) {
    reportsNumber(objectId: $objectId, endDate: $endDate) {
      total
      count
    }
  }
`;

const DISTRIBUTION_QUERY = gql`
  query reportsDistribution(
    $objectId: String
    $field: String!
    $operation: StatsOperation!
    $limit: Int
    $order: String
  ) {
    reportsDistribution(objectId: $objectId, field: $field, operation: $operation, limit: $limit, order: $order) {
      label
      value
    }
  }
`;

const READ_QUERY = gql`
  query report($id: String!) {
    report(id: $id) {
      id
      standard_id
      name
      description
      published
      toStix
    }
  }
`;

describe('Report resolver standard behavior', () => {
  let reportInternalId;
  let datasetReportInternalId;
  let datasetMalwareInternalId;
  const reportStixId = 'report--994491f0-f114-4e41-bcf0-3288c0324f53';
  it('should report created', async () => {
    const CREATE_QUERY = gql`
      mutation ReportAdd($input: ReportAddInput) {
        reportAdd(input: $input) {
          id
          standard_id
          name
          description
          published
        }
      }
    `;
    // Create the report
    const REPORT_TO_CREATE = {
      input: {
        stix_id: reportStixId,
        name: 'Report',
        description: 'Report description',
        published: '2020-02-26T00:51:35.000Z',
        objects: [
          'campaign--92d46985-17a6-4610-8be8-cc70c82ed214',
          'relationship--e35b3fc1-47f3-4ccb-a8fe-65a0864edd02',
        ],
      },
    };
    const report = await queryAsAdmin({
      query: CREATE_QUERY,
      variables: REPORT_TO_CREATE,
    });
    expect(report).not.toBeNull();
    expect(report.data.reportAdd).not.toBeNull();
    expect(report.data.reportAdd.name).toEqual('Report');
    reportInternalId = report.data.reportAdd.id;
  });
  it('should report loaded by internal id', async () => {
    const queryResult = await queryAsAdmin({ query: READ_QUERY, variables: { id: reportInternalId } });
    expect(queryResult).not.toBeNull();
    expect(queryResult.data.report).not.toBeNull();
    expect(queryResult.data.report.id).toEqual(reportInternalId);
    expect(queryResult.data.report.toStix.length).toBeGreaterThan(5);
  });
  it('should report loaded by stix id', async () => {
    const queryResult = await queryAsAdmin({ query: READ_QUERY, variables: { id: reportStixId } });
    expect(queryResult).not.toBeNull();
    expect(queryResult.data.report).not.toBeNull();
    expect(queryResult.data.report.id).toEqual(reportInternalId);
  });
  it('should report stix objects sor stix relationships accurate', async () => {
    const report = await elLoadByStixId('report--a445d22a-db0c-4b5d-9ec8-e9ad0b6dbdd7');
    datasetReportInternalId = report.internal_id;
    const REPORT_STIX_DOMAIN_ENTITIES = gql`
      query report($id: String!) {
        report(id: $id) {
          id
          standard_id
          objects {
            edges {
              node {
                ... on BasicObject {
                  id
                  standard_id
                }
                ... on BasicRelationship {
                  id
                  standard_id
                }
              }
            }
          }
        }
      }
    `;
    const queryResult = await queryAsAdmin({
      query: REPORT_STIX_DOMAIN_ENTITIES,
      variables: { id: datasetReportInternalId },
    });
    expect(queryResult).not.toBeNull();
    expect(queryResult.data.report).not.toBeNull();
    expect(queryResult.data.report.standard_id).toEqual('report--eb147aa9-f6e7-5b5d-9026-63337bb48a45');
    expect(queryResult.data.report.objects.edges.length).toEqual(18);
  });
  it('should report contains stix object or stix relationship accurate', async () => {
    const intrusionSet = await elLoadByStixId('intrusion-set--18854f55-ac7c-4634-bd9a-352dd07613b7');
    const stixRelationship = await elLoadByStixId('relationship--9f999fc5-5c74-4964-ab87-ee4c7cdc37a3');
    const REPORT_CONTAINS_STIX_OBJECT_OR_STIX_RELATIONSHIP = gql`
      query reportContainsStixObjectOrStixRelationship($id: String!, $stixObjectOrStixRelationshipId: String!) {
        reportContainsStixObjectOrStixRelationship(
          id: $id
          stixObjectOrStixRelationshipId: $stixObjectOrStixRelationshipId
        )
      }
    `;
    let queryResult = await queryAsAdmin({
      query: REPORT_CONTAINS_STIX_OBJECT_OR_STIX_RELATIONSHIP,
      variables: {
        id: datasetReportInternalId,
        stixObjectOrStixRelationshipId: intrusionSet.internal_id,
      },
    });
    expect(queryResult).not.toBeNull();
    expect(queryResult.data.reportContainsStixObjectOrStixRelationship).not.toBeNull();
    expect(queryResult.data.reportContainsStixObjectOrStixRelationship).toBeTruthy();
    queryResult = await queryAsAdmin({
      query: REPORT_CONTAINS_STIX_OBJECT_OR_STIX_RELATIONSHIP,
      variables: {
        id: datasetReportInternalId,
        stixObjectOrStixRelationshipId: stixRelationship.internal_id,
      },
    });
    expect(queryResult).not.toBeNull();
    expect(queryResult.data.reportContainsStixObjectOrStixRelationship).not.toBeNull();
    expect(queryResult.data.reportContainsStixObjectOrStixRelationship).toBeTruthy();
  });
  it('should list reports', async () => {
    const queryResult = await queryAsAdmin({ query: LIST_QUERY, variables: { first: 10 } });
    expect(queryResult.data.reports.edges.length).toEqual(7);
  });
  it('should timeseries reports to be accurate', async () => {
    const queryResult = await queryAsAdmin({
      query: TIMESERIES_QUERY,
      variables: {
        field: 'published',
        operation: 'count',
        startDate: '2020-01-01T00:00:00+00:00',
        endDate: '2021-01-01T00:00:00+00:00',
        interval: 'month',
      },
    });
    expect(queryResult.data.reportsTimeSeries.length).toEqual(13);
    expect(queryResult.data.reportsTimeSeries[2].value).toEqual(1);
    expect(queryResult.data.reportsTimeSeries[3].value).toEqual(0);
  });
  it('should timeseries reports for entity to be accurate', async () => {
    const malware = await elLoadByStixId('malware--faa5b705-cf44-4e50-8472-29e5fec43c3c');
    datasetMalwareInternalId = malware.internal_id;
    const queryResult = await queryAsAdmin({
      query: TIMESERIES_QUERY,
      variables: {
        objectId: datasetMalwareInternalId,
        field: 'published',
        operation: 'count',
        startDate: '2020-01-01T00:00:00+00:00',
        endDate: '2021-01-01T00:00:00+00:00',
        interval: 'month',
      },
    });
    expect(queryResult.data.reportsTimeSeries.length).toEqual(13);
    expect(queryResult.data.reportsTimeSeries[2].value).toEqual(1);
    expect(queryResult.data.reportsTimeSeries[3].value).toEqual(0);
  });
  it('should timeseries reports for author to be accurate', async () => {
    const identity = await elLoadByStixId('identity--7b82b010-b1c0-4dae-981f-7756374a17df');
    const queryResult = await queryAsAdmin({
      query: TIMESERIES_QUERY,
      variables: {
        authorId: identity.internal_id,
        field: 'published',
        operation: 'count',
        startDate: '2020-01-01T00:00:00+00:00',
        endDate: '2021-01-01T00:00:00+00:00',
        interval: 'month',
      },
    });
    expect(queryResult.data.reportsTimeSeries.length).toEqual(13);
    expect(queryResult.data.reportsTimeSeries[2].value).toEqual(1);
    expect(queryResult.data.reportsTimeSeries[3].value).toEqual(0);
  });
  it('should reports number to be accurate', async () => {
    const queryResult = await queryAsAdmin({
      query: NUMBER_QUERY,
      variables: {
        endDate: now(),
      },
    });
    expect(queryResult.data.reportsNumber.total).toEqual(7);
    expect(queryResult.data.reportsNumber.count).toEqual(7);
  });
  it('should reports number by entity to be accurate', async () => {
    const queryResult = await queryAsAdmin({
      query: NUMBER_QUERY,
      variables: {
        objectId: datasetMalwareInternalId,
        endDate: now(),
      },
    });
    expect(queryResult.data.reportsNumber.total).toEqual(4);
    expect(queryResult.data.reportsNumber.count).toEqual(4);
  });
  it('should reports distribution to be accurate', async () => {
    const queryResult = await queryAsAdmin({
      query: DISTRIBUTION_QUERY,
      variables: {
        field: 'created-by.name',
        operation: 'count',
      },
    });
    expect(queryResult.data.reportsDistribution.length).toEqual(0);
  });
  it('should reports distribution by entity to be accurate', async () => {
    const queryResult = await queryAsAdmin({
      query: DISTRIBUTION_QUERY,
      variables: {
        objectId: datasetMalwareInternalId,
        field: 'created-by.name',
        operation: 'count',
      },
    });
    const aggregationMap = new Map(queryResult.data.reportsDistribution.map((i) => [i.label, i]));
    expect(aggregationMap.get('ANSSI').value).toEqual(1);
  });
  it('should update report', async () => {
    const UPDATE_QUERY = gql`
      mutation ReportEdit($id: ID!, $input: EditInput!) {
        reportEdit(id: $id) {
          fieldPatch(input: $input) {
            id
            name
            description
            published
          }
        }
      }
    `;
    const queryResult = await queryAsAdmin({
      query: UPDATE_QUERY,
      variables: { id: reportInternalId, input: { key: 'name', value: ['Report - test'] } },
    });
    expect(queryResult.data.reportEdit.fieldPatch.name).toEqual('Report - test');
  });
  it('should context patch report', async () => {
    const CONTEXT_PATCH_QUERY = gql`
      mutation ReportEdit($id: ID!, $input: EditContext) {
        reportEdit(id: $id) {
          contextPatch(input: $input) {
            id
          }
        }
      }
    `;
    const queryResult = await queryAsAdmin({
      query: CONTEXT_PATCH_QUERY,
      variables: { id: reportInternalId, input: { focusOn: 'description' } },
    });
    expect(queryResult.data.reportEdit.contextPatch.id).toEqual(reportInternalId);
  });
  it('should context clean report', async () => {
    const CONTEXT_PATCH_QUERY = gql`
      mutation ReportEdit($id: ID!) {
        reportEdit(id: $id) {
          contextClean {
            id
          }
        }
      }
    `;
    const queryResult = await queryAsAdmin({
      query: CONTEXT_PATCH_QUERY,
      variables: { id: reportInternalId },
    });
    expect(queryResult.data.reportEdit.contextClean.id).toEqual(reportInternalId);
  });
  it('should add relation in report', async () => {
    const RELATION_ADD_QUERY = gql`
      mutation ReportEdit($id: ID!, $input: StixMetaRelationshipAddInput!) {
        reportEdit(id: $id) {
          relationAdd(input: $input) {
            id
            from {
              ... on Report {
                objectMarking {
                  edges {
                    node {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;
    const queryResult = await queryAsAdmin({
      query: RELATION_ADD_QUERY,
      variables: {
        id: reportInternalId,
        input: {
          toId: 'marking-definition--78ca4366-f5b8-4764-83f7-34ce38198e27',
          relationship_type: 'object-marking',
        },
      },
    });
    expect(queryResult.data.reportEdit.relationAdd.from.objectMarking.edges.length).toEqual(1);
  });
  it('should delete relation in report', async () => {
    const RELATION_DELETE_QUERY = gql`
      mutation ReportEdit($id: ID!, $toId: String!, $relationship_type: String!) {
        reportEdit(id: $id) {
          relationDelete(toId: $toId, relationship_type: $relationship_type) {
            id
            objectMarking {
              edges {
                node {
                  id
                }
              }
            }
          }
        }
      }
    `;
    const queryResult = await queryAsAdmin({
      query: RELATION_DELETE_QUERY,
      variables: {
        id: reportInternalId,
        toId: 'marking-definition--78ca4366-f5b8-4764-83f7-34ce38198e27',
        relationship_type: 'object-marking',
      },
    });
    expect(queryResult.data.reportEdit.relationDelete.objectMarking.edges.length).toEqual(0);
  });
  it('should report deleted', async () => {
    const DELETE_QUERY = gql`
      mutation reportDelete($id: ID!) {
        reportEdit(id: $id) {
          delete
        }
      }
    `;
    // Delete the report
    await queryAsAdmin({
      query: DELETE_QUERY,
      variables: { id: reportInternalId },
    });
    // Verify is no longer found
    const queryResult = await queryAsAdmin({ query: READ_QUERY, variables: { id: reportStixId } });
    expect(queryResult).not.toBeNull();
    expect(queryResult.data.report).toBeNull();
  });
});
