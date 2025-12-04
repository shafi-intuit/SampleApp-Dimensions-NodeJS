export const getAllDimensionsQuery = `query ActiveCustomDimensionDefinitionsQuery {
  appFoundationsActiveCustomDimensionDefinitions(
    first: 20
    after: null
    last: null
    before: null
  ) {
    edges {
      node {
        ...CustomDimensionDefinitionAttributes
       }
    }
  }
}

fragment CustomDimensionDefinitionAttributes on AppFoundations_CustomDimensionDefinition {
  id
  label
  active
}`;