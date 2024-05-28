import { useApplyParams } from "@/components/analytics/use-apply-params";
import { UserContext } from "@/components/app-provider";
import { EmptyState } from "@/components/empty-state";
import { getDashboardLayout } from "@/components/layout/dashboard-layout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/ui/loader";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toolbar } from "@/components/ui/toolbar";
import { useToast } from "@/components/ui/use-toast";
import { useFeature } from "@/hooks/use-feature";
import { SubmitHandler, useZodForm } from "@/hooks/use-form";
import { useUser } from "@/hooks/use-user";
import { NextPageWithLayout } from "@/lib/page";
import { cn, getHighestPriorityRole } from "@/lib/utils";
import {
  ExclamationTriangleIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { Cross1Icon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EnumStatusCode } from "@wundergraph/cosmo-connect/dist/common/common_pb";
import {
  getOrganizationMembers,
  getPendingOrganizationMembers,
  inviteUser,
  isMemberLimitReached,
  removeInvitation,
  removeOrganizationMember,
  updateOrgMemberRole,
} from "@wundergraph/cosmo-connect/dist/platform/v1/platform-PlatformService_connectquery";
import { sentenceCase } from "change-case";
import Link from "next/link";
import { useRouter } from "next/router";
import { useContext, useState } from "react";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { useDebounce } from "use-debounce";
import { z } from "zod";

const emailInputSchema = z.object({
  email: z.string().email(),
});

type EmailInput = z.infer<typeof emailInputSchema>;

const InviteForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const {
    register,
    formState: { isValid, errors },
    reset,
    handleSubmit,
  } = useZodForm<EmailInput>({
    mode: "onChange",
    schema: emailInputSchema,
  });

  const { mutate, isPending } = useMutation(inviteUser.useMutation());

  const { toast } = useToast();

  const sendToast = (description: string) => {
    const { id } = toast({ description, duration: 3000 });
  };

  const onSubmit: SubmitHandler<EmailInput> = (data) => {
    mutate(
      { email: data.email },
      {
        onSuccess: (d) => {
          sendToast(d.response?.details || "Invited member successfully.");
          onSuccess();
          reset();
        },
        onError: (error) => {
          sendToast("Could not invite the member. Please try again.");
        },
      },
    );
  };

  return (
    <form className="flex gap-x-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex-1">
        <Input
          placeholder="janedoe@example.com"
          className="w-full"
          type="text"
          {...register("email")}
        />
        {errors.email && (
          <span className="mt-2 text-sm text-destructive">
            {errors.email.message}
          </span>
        )}
      </div>
      <Button
        type="submit"
        disabled={!isValid}
        variant="default"
        isLoading={isPending}
      >
        Invite
      </Button>
    </form>
  );
};

const MemberCard = ({
  email,
  role,
  memberUserID,
  acceptedInvite,
  isAdmin,
  isCurrentUser,
  active,
  refresh,
}: {
  email: string;
  role?: string;
  memberUserID: string;
  acceptedInvite: boolean;
  isAdmin: boolean;
  isCurrentUser: boolean;
  active?: boolean;
  refresh: () => void;
}) => {
  const user = useContext(UserContext);

  const { mutate: resendInvitation } = useMutation(inviteUser.useMutation());
  const { mutate: revokeInvitation } = useMutation(
    removeInvitation.useMutation(),
  );
  const { mutate: removeMember } = useMutation(
    removeOrganizationMember.useMutation(),
  );
  const { mutate: updateUserRole } = useMutation(
    updateOrgMemberRole.useMutation(),
  );

  const { toast, update } = useToast();

  return (
    <TableRow>
      <TableCell>{email}</TableCell>
      <TableCell>
        <div className="flex items-center gap-x-4 text-muted-foreground">
          {active === false && <Badge variant="destructive">Disabled</Badge>}
          <div className={cn({ "pr-[14px]": isAdmin && isCurrentUser })}>
            {acceptedInvite && role ? (
              <span className="text-sm">{sentenceCase(role)}</span>
            ) : (
              <span className="text-sm text-gray-800 dark:text-gray-400">
                Pending
              </span>
            )}
          </div>

          <div>
            {isAdmin && !isCurrentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="cursor-pointer">
                    <HiOutlineDotsVertical />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[180px]">
                  {!acceptedInvite && (
                    <DropdownMenuItem
                      onClick={() => {
                        const { id } = toast({
                          description: "Inviting member...",
                        });
                        resendInvitation(
                          { email },
                          {
                            onSuccess: (d) => {
                              update({
                                description:
                                  d.response?.details ||
                                  "Invited member successfully.",
                                duration: 2000,
                                id: id,
                              });
                            },
                            onError: (error) => {
                              update({
                                description:
                                  "Could not invite the member. Please try again.",
                                duration: 3000,
                                id: id,
                              });
                            },
                          },
                        );
                      }}
                    >
                      Resend invitation
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => {
                      if (acceptedInvite) {
                        removeMember(
                          { email },
                          {
                            onSuccess: (d) => {
                              toast({
                                description:
                                  d.response?.details ||
                                  "Removed member successfully.",
                                duration: 3000,
                              });
                              refresh();
                            },
                            onError: (error) => {
                              toast({
                                description:
                                  "Could not remove member. Please try again.",
                                duration: 3000,
                              });
                            },
                          },
                        );
                      } else {
                        revokeInvitation(
                          { email },
                          {
                            onSuccess: (d) => {
                              toast({
                                description:
                                  d.response?.details ||
                                  "Removed invitation successfully.",
                                duration: 3000,
                              });
                              refresh();
                            },
                            onError: (error) => {
                              toast({
                                description:
                                  "Could not remove invitation. Please try again.",
                                duration: 3000,
                              });
                            },
                          },
                        );
                      }
                    }}
                  >
                    {acceptedInvite ? "Remove member" : "Remove invitation"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      updateUserRole(
                        {
                          userID: user?.id,
                          orgMemberUserID: memberUserID,
                          role: role === "admin" ? "developer" : "admin",
                        },
                        {
                          onSuccess: (d) => {
                            toast({
                              description:
                                d.response?.details ||
                                (role === "admin"
                                  ? "Demoted member successfully."
                                  : "Promoted member successfully."),
                              duration: 3000,
                            });
                            refresh();
                          },
                          onError: (error) => {
                            toast({
                              description:
                                role === "admin"
                                  ? "Could not demote member. Please try again."
                                  : "Could not promote member. Please try again.",
                              duration: 3000,
                            });
                          },
                        },
                      );
                    }}
                  >
                    {role === "admin"
                      ? "Demote to developer"
                      : "Promote to admin"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
};

const PendingInvitations = ({
  limit,
  offset,
  pageNumber,
  search,
}: {
  limit: number;
  offset: number;
  pageNumber: number;
  search: string;
}) => {
  const user = useUser();
  const isAdmin = user?.currentOrganization.roles.includes("admin") ?? false;
  const [debouncedSearch] = useDebounce(search, 500);

  const { data, isLoading, error, refetch } = useQuery({
    ...getPendingOrganizationMembers.useQuery({
      pagination: {
        limit,
        offset,
      },
      search: debouncedSearch,
    }),
    queryKey: [
      user?.currentOrganization.slug || "",
      "GetPendingOrganizationMembers",
      { pagination: { limit, offset }, search: debouncedSearch },
    ],
  });

  const noOfPages = Math.ceil(data?.totalCount ?? 0 / limit);

  if (isLoading) return <Loader fullscreen />;

  if (error || data?.response?.code !== EnumStatusCode.OK || !user)
    return (
      <EmptyState
        icon={<ExclamationTriangleIcon />}
        title="Could not retrieve pending invites of this organization."
        description={
          data?.response?.details || error?.message || "Please try again"
        }
        actions={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );

  if (!data?.pendingInvitations) return null;

  return (
    <>
      <TableWrapper className="max-h-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-full">Email</TableHead>
              <TableHead className="">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.pendingInvitations?.map((member) => {
              return (
                <MemberCard
                  key={member.userID}
                  email={member.email}
                  memberUserID={member.userID}
                  acceptedInvite={false}
                  isAdmin={isAdmin || false}
                  isCurrentUser={member.email === user.email}
                  refresh={() => refetch()}
                />
              );
            })}
            {data.pendingInvitations.length === 0 && (
              <p className="w-full p-8 text-center italic text-muted-foreground">
                No invitations found
              </p>
            )}
          </TableBody>
        </Table>
      </TableWrapper>
      <Pagination limit={limit} noOfPages={noOfPages} pageNumber={pageNumber} />
    </>
  );
};

const AcceptedMembers = ({
  limit,
  offset,
  pageNumber,
  search,
}: {
  limit: number;
  offset: number;
  pageNumber: number;
  search: string;
}) => {
  const user = useUser();
  const isAdmin = user?.currentOrganization.roles.includes("admin") ?? false;
  const [debouncedSearch] = useDebounce(search, 500);

  const { data, isLoading, error, refetch } = useQuery({
    ...getOrganizationMembers.useQuery({
      pagination: {
        limit,
        offset,
      },
      search: debouncedSearch,
    }),
    queryKey: [
      user?.currentOrganization.slug || "",
      "GetOrganizationMembers",
      { pagination: { limit, offset }, search: debouncedSearch },
    ],
  });

  const noOfPages = Math.ceil(data?.totalCount ?? 0 / limit);

  if (isLoading) return <Loader fullscreen />;

  if (error || data?.response?.code !== EnumStatusCode.OK || !user)
    return (
      <EmptyState
        icon={<ExclamationTriangleIcon />}
        title="Could not retrieve the members of this organization."
        description={
          data?.response?.details || error?.message || "Please try again"
        }
        actions={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );

  if (!data?.members) return null;

  return (
    <>
      <TableWrapper className="max-h-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-full">Email</TableHead>
              <TableHead className="">Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.members?.map((member) => {
              return (
                <MemberCard
                  key={member.userID}
                  email={member.email}
                  role={getHighestPriorityRole({ userRoles: member.roles })}
                  memberUserID={member.userID}
                  acceptedInvite={true}
                  isAdmin={isAdmin || false}
                  isCurrentUser={member.email === user.email}
                  active={member.active}
                  refresh={() => refetch()}
                />
              );
            })}
          </TableBody>
          {data.members.length === 0 && (
            <p className="w-full p-8 text-center italic text-muted-foreground">
              No members found
            </p>
          )}
        </Table>
      </TableWrapper>
      <Pagination limit={limit} noOfPages={noOfPages} pageNumber={pageNumber} />
    </>
  );
};

const MembersToolbar = () => {
  const usersFeature = useFeature("users");
  const user = useUser();
  const organizationSlug = user?.currentOrganization.slug;
  const isAdmin = user?.currentOrganization.roles.includes("admin") ?? false;
  const client = useQueryClient();

  const { data } = useQuery(isMemberLimitReached.useQuery());

  const limitReached = data?.limitReached ?? false;

  return (
    <Toolbar className="w-auto">
      <Dialog>
        <DialogTrigger asChild>
          <Button>
            <UserPlusIcon className="mr-2 h-4 w-4" /> Invite Member
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>
              Send an invite to an email id to invite them into your
              organization
            </DialogDescription>
          </DialogHeader>
          {!limitReached && isAdmin && (
            <InviteForm
              onSuccess={() => {
                const currentKey = getOrganizationMembers.getQueryKey();
                const pendingKey = getPendingOrganizationMembers.getQueryKey();
                client.invalidateQueries({
                  queryKey: currentKey,
                });
                client.invalidateQueries({
                  queryKey: pendingKey,
                });
              }}
            />
          )}
          {limitReached && isAdmin && (
            <Alert className="flex flex-col gap-y-4">
              <div className="flex-1">
                <AlertTitle>User limit reached</AlertTitle>
                <AlertDescription>
                  You&apos;ve added {data?.memberCount} of {usersFeature?.limit}{" "}
                  users, please upgrade your account to increase your limits.
                </AlertDescription>
              </div>
              <Button variant="outline" asChild>
                <Link href={`/${organizationSlug}/billing`}>View plans</Link>
              </Button>
            </Alert>
          )}
        </DialogContent>
      </Dialog>
    </Toolbar>
  );
};

const MembersPage: NextPageWithLayout = () => {
  const router = useRouter();
  const user = useUser();
  const tab = router.query.tab || "current";

  const applyParams = useApplyParams();
  const [search, setSearch] = useState("");

  const { data } = useQuery({
    ...getPendingOrganizationMembers.useQuery(),
    queryKey: [
      user?.currentOrganization.slug || "",
      "GetPendingOrganizationMembers",
      {},
    ],
  });

  const pageNumber = router.query.page
    ? parseInt(router.query.page as string)
    : 1;
  const pageSize = Number.parseInt((router.query.pageSize as string) || "10");
  const limit = pageSize > 50 ? 50 : pageSize;
  const offset = (pageNumber - 1) * limit;

  return (
    <div className="flex h-full flex-col gap-y-6">
      <div className="flex flex-col justify-between gap-y-4 md:flex-row md:items-center">
        <Tabs
          onValueChange={(v) => {
            applyParams({
              tab: v,
              page: null,
              pageSize: null,
            });
          }}
          defaultValue="current"
        >
          <TabsList>
            <TabsTrigger value="current">Current</TabsTrigger>
            <TabsTrigger value="pending" className="gap-x-1">
              Pending{" "}
              {(data?.totalCount ?? 0 > 0) && (
                <Badge className="px-2">{data?.totalCount ?? 0}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute bottom-0 left-3 top-0 my-auto" />
          <Input
            placeholder="Search"
            className="pl-8 pr-10"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
          />
          {search && (
            <Button
              variant="ghost"
              className="absolute bottom-0 right-0 top-0 my-auto rounded-l-none"
              onClick={() => {
                setSearch("");
              }}
            >
              <Cross1Icon />
            </Button>
          )}
        </div>
      </div>
      {tab === "current" ? (
        <AcceptedMembers
          limit={limit}
          offset={offset}
          pageNumber={pageNumber}
          search={search}
        />
      ) : (
        <PendingInvitations
          limit={limit}
          offset={offset}
          pageNumber={pageNumber}
          search={search}
        />
      )}
    </div>
  );
};

MembersPage.getLayout = (page) => {
  return getDashboardLayout(
    page,
    "Members",
    "Manage all the members of your organization",
    null,
    <MembersToolbar />,
  );
};

export default MembersPage;
