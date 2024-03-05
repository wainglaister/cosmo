import { UserContext } from "@/components/app-provider";
import { NamespaceSelector } from "@/components/dashboard/NamespaceSelector";
import { EmptyState } from "@/components/empty-state";
import { getDashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader } from "@/components/ui/loader";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { docsBaseURL } from "@/lib/constants";
import { NextPageWithLayout } from "@/lib/page";
import { cn } from "@/lib/utils";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { EnumStatusCode } from "@wundergraph/cosmo-connect/dist/common/common_pb";
import {
  configureNamespaceLintConfig,
  enableLintingForTheNamespace,
  getNamespaceLintConfig,
} from "@wundergraph/cosmo-connect/dist/platform/v1/platform-PlatformService_connectquery";
import {
  LintConfig,
  LintSeverity,
} from "@wundergraph/cosmo-connect/dist/platform/v1/platform_pb";
import Link from "next/link";
import { useContext, useEffect, useState } from "react";

const lintCategories = [
  {
    title: "Naming Convention",
    description:
      "Configure these rules to enforce naming convention across this namespace's schemas.",
    rules: [
      {
        name: "FIELD_NAMES_SHOULD_BE_CAMEL_CASE",
        description: "Field names should always use camelCase.",
      },
      {
        name: "TYPE_NAMES_SHOULD_BE_PASCAL_CASE",
        description: "Type names should always use PascalCase.",
      },
      {
        name: "SHOULD_NOT_HAVE_TYPE_PREFIX",
        description: "A type's name should never be prefixed with 'Type'.",
      },
      {
        name: "SHOULD_NOT_HAVE_TYPE_SUFFIX",
        description: "A type's name should never be suffixed with 'Type'.",
      },
      {
        name: "SHOULD_NOT_HAVE_INPUT_PREFIX",
        description: "An input's name should never be prefixed with 'Input'.",
      },
      {
        name: "SHOULD_HAVE_INPUT_SUFFIX",
        description: "An input's name should always be suffixed with 'Input'.",
      },
      {
        name: "SHOULD_NOT_HAVE_ENUM_PREFIX",
        description: "An enum's name should never be prefixed with 'Enum'.",
      },
      {
        name: "SHOULD_NOT_HAVE_ENUM_SUFFIX",
        description: "An enum's name should never be suffixed with 'Enum'.",
      },
      {
        name: "SHOULD_NOT_HAVE_INTERFACE_PREFIX",
        description:
          "An interface type's name should never be prefixed with 'Interface'.",
      },
      {
        name: "SHOULD_NOT_HAVE_INTERFACE_SUFFIX",
        description:
          "An interface type's name should never be suffixed with 'Interface'.",
      },
      {
        name: "ENUM_VALUES_SHOULD_BE_UPPER_CASE",
        description: "Enum values should always use UPPER_CASE.",
      },
    ],
  },
  {
    title: "Alphabetical Sort",
    description:
      "Configure these rules to enforce the arrangement of types, fields... in the schema.",
    rules: [
      {
        name: "ORDER_FIELDS",
        description: "Should sort all the fields in alphabetical order.",
      },
      {
        name: "ORDER_ENUM_VALUES",
        description: "Should sort all the enum values in alphabetical order.",
      },
      {
        name: "ORDER_DEFINITIONS",
        description: "Should sort all the definitions in alphabetical order.",
      },
    ],
  },
  {
    title: "Others",
    description:
      "Configure these rules to define conventions throughout our schema.",
    rules: [
      {
        name: "ALL_TYPES_REQUIRE_DESCRIPTION",
        description:
          "Should describe all the type definitions with a description.",
      },
      {
        name: "DISALLOW_CASE_INSENSITIVE_ENUM_VALUES",
        description:
          "Enum values should eliminate duplicates by disallowing case insensitivity.",
      },
      {
        name: "NO_TYPENAME_PREFIX_IN_TYPE_FIELDS",
        description: "Field names should not be prefixed with its type's name.",
      },
      {
        name: "REQUIRE_DEPRECATION_REASON",
        description: "Should provide the reason on @deprecated directive.",
      },
      {
        name: "REQUIRE_DEPRECATION_DATE",
        description:
          "Should provide the deletion date on @deprecated directive.",
      },
    ],
  },
];

const SeverityDropdown = ({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: "error" | "warn";
}) => {
  return (
    <div className="flex items-center gap-x-2 px-1">
      <Select
        value={value}
        onValueChange={(value) => {
          onChange(value);
        }}
      >
        <SelectTrigger className="h-8 w-36">
          <SelectValue placeholder={value} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Lint Severity</SelectLabel>
            {["warn", "error"].map((pageSize) => (
              <SelectItem key={pageSize} value={`${pageSize}`}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

const countLintConfigsByCategory = (lintConfigs: LintConfig[]) => {
  let countNamingConventionRules = 0;
  let countAlphabeticalSortRules = 0;
  let countOtherRules = 0;

  const namingConventionRules = lintCategories[0].rules.map((l) => l.name);
  const alphabeticalSortRules = lintCategories[1].rules.map((l) => l.name);
  const otherRules = lintCategories[2].rules.map((l) => l.name);

  for (const l of lintConfigs) {
    if (namingConventionRules.includes(l.ruleName)) {
      countNamingConventionRules += 1;
    } else if (alphabeticalSortRules.includes(l.ruleName)) {
      countAlphabeticalSortRules += 1;
    } else if (otherRules.includes(l.ruleName)) {
      countOtherRules += 1;
    }
  }

  return [
    countNamingConventionRules,
    countAlphabeticalSortRules,
    countOtherRules,
  ];
};

const LintPolicyPage: NextPageWithLayout = () => {
  const user = useContext(UserContext);
  const [namespace] = useLocalStorage("namespace", "default");
  const { data, isLoading, refetch, error } = useQuery({
    ...getNamespaceLintConfig.useQuery({
      namespace,
    }),
    queryKey: [
      user?.currentOrganization.slug || "",
      "GetNamespaceLintConfig",
      { namespace },
    ],
  });
  const { mutate: configureLintRules, isPending: isConfiguring } = useMutation(
    configureNamespaceLintConfig.useMutation(),
  );

  const { mutate } = useMutation(enableLintingForTheNamespace.useMutation());

  const { toast } = useToast();

  const [linterEnabled, setLinterEnabled] = useState(false);
  const [selectedLintRules, setSelectedLintRules] = useState<LintConfig[]>([]);
  const [countByCategory, setCountByCategory] = useState<number[]>();

  useEffect(() => {
    if (!data) return;
    setSelectedLintRules(data.configs);
    setLinterEnabled(data.linterEnabled);
    setCountByCategory(countLintConfigsByCategory(data.configs));
  }, [data]);

  if (isLoading) return <Loader fullscreen />;
  if (error || data?.response?.code !== EnumStatusCode.OK)
    return (
      <EmptyState
        icon={<ExclamationTriangleIcon />}
        title="Could not retrieve the lint config of the namesapce"
        description={
          data?.response?.details || error?.message || "Please try again"
        }
        actions={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );

  return (
    <div className=" mt-2 flex w-full flex-col gap-4">
      <div className="flex w-full items-center justify-between px-1">
        <div className="flex flex-col gap-y-1 px-1">
          <span>Enable Linter</span>
          <p className="text-sm text-muted-foreground">
            Run the lint check on all the check operations of this namespace.
          </p>
        </div>
        <div>
          <Switch
            className="h-18 w-10"
            checked={linterEnabled}
            onCheckedChange={(checked) => {
              setLinterEnabled(checked);
              mutate(
                {
                  namespace,
                  enableLinting: checked,
                },
                {
                  onSuccess: (d) => {
                    if (d.response?.code === EnumStatusCode.OK) {
                      toast({
                        description: checked
                          ? "Linter enabled successfully."
                          : "Linter disabled successfully",
                        duration: 3000,
                      });
                    } else if (d.response?.details) {
                      toast({
                        description: d.response.details,
                        duration: 3000,
                      });
                    }
                    refetch();
                  },
                  onError: (error) => {
                    toast({
                      description: checked
                        ? "Could not enable the linter. Please try again."
                        : "Could not disable the linter. Please try again.",
                      duration: 3000,
                    });
                  },
                },
              );
            }}
          />
        </div>
      </div>
      <Separator className="my-2" />
      <div className=" flex w-full flex-col gap-4">
        <div className="flex w-full justify-between px-1">
          <div className="flex flex-col gap-y-1">
            <span>Lint Rules</span>
            <p className="text-sm text-muted-foreground">
              {data.linterEnabled
                ? "Configure the linter rules and its severity levels for the lint check performed during each check operation of this namespace."
                : "Enable the linter to configure the lint rules."}{" "}
              <Link
                href={docsBaseURL + "/studio/lint-policy"}
                className="text-primary"
                target="_blank"
                rel="noreferrer"
              >
                Learn more
              </Link>
            </p>
          </div>
          <Button
            className="mt-2"
            type="submit"
            variant="default"
            isLoading={isConfiguring}
            disabled={!data.linterEnabled}
            onClick={() => {
              configureLintRules(
                {
                  namespace,
                  configs: selectedLintRules,
                },
                {
                  onSuccess: (d) => {
                    if (d.response?.code === EnumStatusCode.OK) {
                      toast({
                        description: "Lint Policy applied succesfully.",
                        duration: 3000,
                      });
                    } else if (d.response?.details) {
                      toast({
                        description: d.response.details,
                        duration: 3000,
                      });
                    }
                    refetch();
                  },
                  onError: (error) => {
                    toast({
                      description:
                        "Could not apply the lint policy. Please try again.",
                      duration: 3000,
                    });
                  },
                },
              );
            }}
          >
            Apply
          </Button>
        </div>
        <div className="border-1 overflow-y-auto rounded-md border px-4">
          <Accordion
            type="single"
            collapsible
            className="h-full w-full overflow-y-auto overflow-x-hidden"
            disabled={!data.linterEnabled}
          >
            {lintCategories.map((lintCategory, index) => {
              return (
                <AccordionItem value={index.toString()} key={index.toString()}>
                  <AccordionTrigger
                    className={cn("hover:no-underline", {
                      "cursor-not-allowed text-muted-foreground":
                        !data.linterEnabled,
                    })}
                    disabled={!data.linterEnabled}
                  >
                    <div className="flex w-full flex-col items-start gap-y-1">
                      <div className="flex items-center gap-x-2">
                        <span className="text-lg">{lintCategory.title}</span>
                        {data.linterEnabled &&
                          countByCategory && (
                            <Badge
                              variant="muted"
                              className="mt-[2px] h-[18px] px-2 text-xs"
                            >
                              {`${countByCategory[index]} of ${
                                lintCategory.rules.length
                              }`}
                            </Badge>
                          )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {lintCategory.description}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="mt-2 flex w-full flex-col gap-y-3">
                      {lintCategory.rules.map((rule, index) => {
                        return (
                          <div
                            className="border-1 flex w-full items-center justify-between rounded-md border p-4"
                            key={index + rule.name}
                          >
                            <div className="flex items-start gap-x-4">
                              <Checkbox
                                id={rule.name}
                                className="h-5 w-5"
                                checked={selectedLintRules.some(
                                  (l) => l.ruleName === rule.name,
                                )}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedLintRules([
                                      ...selectedLintRules,
                                      {
                                        ruleName: rule.name,
                                        severityLevel: LintSeverity.warn,
                                      } as LintConfig,
                                    ]);
                                  } else {
                                    setSelectedLintRules(
                                      selectedLintRules.filter(
                                        (l) => l.ruleName !== rule.name,
                                      ),
                                    );
                                  }
                                }}
                              />
                              <div className="flex flex-col gap-y-1">
                                <label
                                  htmlFor={rule.name}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {rule.name}
                                </label>
                                <span className="text-sm text-muted-foreground">
                                  {rule.description}
                                </span>
                              </div>
                            </div>

                            <SeverityDropdown
                              value={
                                selectedLintRules.find(
                                  (l) => l.ruleName === rule.name,
                                )?.severityLevel === LintSeverity.error
                                  ? "error"
                                  : "warn"
                              }
                              onChange={(value) => {
                                setSelectedLintRules(
                                  selectedLintRules.map((l) => {
                                    if (l.ruleName === rule.name) {
                                      return {
                                        ...l,
                                        severityLevel:
                                          value === "error"
                                            ? LintSeverity.error
                                            : LintSeverity.warn,
                                      } as LintConfig;
                                    } else {
                                      return l;
                                    }
                                  }),
                                );
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
        <div className="flex w-full justify-end"></div>
      </div>
    </div>
  );
};

LintPolicyPage.getLayout = (page) => {
  return getDashboardLayout(
    page,
    "Lint Policy",
    "Configure the rules used for linting this namespace's subgraphs.",
    undefined,
    undefined,
    [<NamespaceSelector key="0" />],
  );
};

export default LintPolicyPage;