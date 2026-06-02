export type ContainerBinding<T> = abstract new (...args: never[]) => T

export interface BindingResolver {
  make<T>(binding: ContainerBinding<T>): Promise<T>
}

export interface BindingRegistrar {
  singleton<T>(
    binding: ContainerBinding<T>,
    factory: (resolver: BindingResolver) => T | Promise<T>
  ): void
}
