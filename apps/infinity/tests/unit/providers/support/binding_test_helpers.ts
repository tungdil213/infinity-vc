import type {
  BindingRegistrar,
  BindingResolver,
  ContainerBinding,
} from '../../../../providers/bindings/binding_contracts.js'

type BindingFactory<T> = (resolver: BindingResolver) => T | Promise<T>

export class RecordingBindingRegistrar implements BindingRegistrar {
  readonly bindings = new Map<ContainerBinding<unknown>, BindingFactory<unknown>>()

  singleton<T>(binding: ContainerBinding<T>, factory: BindingFactory<T>): void {
    this.bindings.set(binding, factory as BindingFactory<unknown>)
  }
}

export class MapBindingResolver implements BindingResolver {
  constructor(private readonly values: Map<ContainerBinding<unknown>, unknown>) {}

  async make<T>(binding: ContainerBinding<T>): Promise<T> {
    const value = this.values.get(binding)
    if (value === undefined) {
      throw new Error(`Missing binding for ${binding.name}`)
    }

    return value as T
  }
}

export type { ContainerBinding }
