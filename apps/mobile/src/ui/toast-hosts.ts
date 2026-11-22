interface Host {
  scope: string | undefined;
}

const hosts: Host[] = [];

export function mountHost(scope: string | undefined) {
  const host: Host = { scope };
  hosts.push(host);
  return () => {
    hosts.splice(hosts.indexOf(host), 1);
  };
}

export function frontHost(): Host | undefined {
  return hosts.findLast((host) => host.scope !== undefined) ?? hosts.at(-1);
}
