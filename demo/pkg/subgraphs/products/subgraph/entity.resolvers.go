package subgraph

// This file will be automatically regenerated based on the schema, any resolver implementations
// will be copied through when generating and any unknown code will be moved to the end.
// Code generated by github.com/99designs/gqlgen version v0.17.39

import (
	"context"

	"github.com/wundergraph/cosmo/demo/pkg/subgraphs/products/subgraph/generated"
	"github.com/wundergraph/cosmo/demo/pkg/subgraphs/products/subgraph/model"
)

// FindConsultancyByUpc is the resolver for the findConsultancyByUpc field.
func (r *entityResolver) FindConsultancyByUpc(ctx context.Context, upc string) (*model.Consultancy, error) {
	return consultancy, nil
}

// FindCosmoByUpc is the resolver for the findCosmoByUpc field.
func (r *entityResolver) FindCosmoByUpc(ctx context.Context, upc string) (*model.Cosmo, error) {
	return cosmo, nil
}

// FindEmployeeByID is the resolver for the findEmployeeByID field.
func (r *entityResolver) FindEmployeeByID(ctx context.Context, id int) (*model.Employee, error) {
	switch id {
	// Dustin, Nithin, Suvij
	case 2, 7, 8:
		return &model.Employee{
			Products: []model.ProductName{
				model.ProductNameCosmo,
				model.ProductNameSdk,
			},
			Notes: "2, 7, 8 notes resolved by products",
		}, nil
	// Stefan,
	case 3:
		return &model.Employee{
			Products: []model.ProductName{
				model.ProductNameMarketing,
			},
			Notes: "3 notes resolved by products",
		}, nil
	// Björn
	case 4:
		return &model.Employee{
			Products: []model.ProductName{
				model.ProductNameFinance,
				model.ProductNameHumanResources,
				model.ProductNameMarketing,
			},
			Notes: "4 notes resolved by products",
		}, nil
	// Sergiy
	case 5:
		return &model.Employee{
			Products: []model.ProductName{
				model.ProductNameEngine,
				model.ProductNameSdk,
			},
			Notes: "5 notes resolved by products",
		}, nil
	// Alexandra
	case 11:
		return &model.Employee{
			Products: []model.ProductName{
				model.ProductNameFinance,
			},
			Notes: "11 notes resolved by products",
		}, nil
	// Alberto, David
	case 9, 12:
		return &model.Employee{
			Products: []model.ProductName{
				model.ProductNameCosmo, model.ProductNameEngine, model.ProductNameSdk,
			},
			Notes: "9, 12 notes resolved by products",
		}, nil
	// Eelco
	case 10:
		return &model.Employee{
			Products: []model.ProductName{
				model.ProductNameCosmo,
				model.ProductNameSdk,
			},
			Notes: "10 notes resolved by products",
		}, nil
	// Jens
	default:
		return &model.Employee{
			Products: []model.ProductName{
				model.ProductNameCosmo,
				model.ProductNameEngine,
				model.ProductNameSdk,
			},
			Notes: "1 notes resolved by products",
		}, nil
	}
}

// Entity returns generated.EntityResolver implementation.
func (r *Resolver) Entity() generated.EntityResolver { return &entityResolver{r} }

type entityResolver struct{ *Resolver }
