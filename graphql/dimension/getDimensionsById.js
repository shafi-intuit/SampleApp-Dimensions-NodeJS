export const getDimensionsByIdQuery = `
query GetActiveCustomDimensionValues(
  $first: Int,
  $after: String,
  $last: Int,
  $before: String,
  $filters: AppFoundations_ActiveCustomDimensionValuesFilterBy!
) {
  appFoundationsActiveCustomDimensionValues(
    first: $first
    after: $after
    last: $last
    before: $before
    filters: $filters
  ) {
    edges {
      node {
        id
        definitionId
        label
        active
        parentId
        fullyQualifiedLabel
        level
      }
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}`;



export const getDimensionsByIdVariable = (id) => {
  return {
    first: null,
    after: null,
    last: null,
    before: null,
    filters: {
      definitionId: id,
      parentId: null
    }
  };
};