<script setup lang="ts">
import { useDataTableComponent } from "../../assets/scripts/tables/useDataTableComponent";
import type { DataTableVm } from "../../assets/scripts/tables/useDataTableComponent";

const props = defineProps<{ table: DataTableVm }>();

const { hasActions, ariaSort, cellText, actionAria } =
  useDataTableComponent(props);
</script>

<template>
  <section class="table-card" :aria-label="table.ariaLabel">
    <div class="table-toolbar" role="search" aria-label="Table tools">
      <label class="table-search" aria-label="Search">
        <span class="sr-only">Search</span>
        <input
          class="table-search-input"
          type="search"
          name="q"
          autocomplete="off"
          v-model="table.search.value"
          placeholder="Search…"
          aria-label="Search table rows"
        />
      </label>

      <label class="table-size" aria-label="Rows per page">
        <span class="sr-only">Rows per page</span>
        <select
          class="table-size-select"
          name="pageSize"
          :value="table.pageSize.value"
          @change="
            table.setPageSize(
              Number(($event.target as HTMLSelectElement).value),
            )
          "
          aria-label="Select rows per page"
        >
          <option v-for="n in table.pageSizes" :key="n" :value="n">
            {{ n }}
          </option>
        </select>
      </label>

      <div class="table-count" aria-live="polite">
        {{ table.totalRows.value }} rows
      </div>
    </div>

    <div
      ref="wrap"
      class="table-wrap"
      role="region"
      :aria-label="`${table.ariaLabel} container`"
    >
      <table class="data-table" :aria-label="table.ariaLabel">
        <caption class="sr-only">
          {{
            table.caption
          }}
        </caption>

        <thead>
          <tr>
            <th
              v-for="c in table.columns"
              :key="c.id"
              scope="col"
              :style="{ width: c.width }"
              :aria-label="c.ariaHeader || c.header"
              :aria-sort="ariaSort(c.id)"
              :class="[
                c.align === 'right'
                  ? 'th-right'
                  : c.align === 'center'
                    ? 'th-center'
                    : 'th-left',
              ]"
            >
              <button
                class="sort-btn"
                type="button"
                :disabled="!c.sortable"
                :aria-disabled="!c.sortable"
                :aria-label="c.sortable ? `Sort by ${c.header}` : `${c.header}`"
                @click="table.setSort(c.id)"
              >
                <span class="sort-btn-text">{{ c.header }}</span>
                <span v-if="c.sortable" class="sort-ind" aria-hidden="true"
                  >↕</span
                >
              </button>
            </th>

            <th
              v-if="hasActions"
              scope="col"
              class="th-actions"
              aria-label="Actions"
            >
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="r in table.pageRows.value" :key="table.rowId(r)">
            <td
              v-for="c in table.columns"
              :key="c.id"
              :class="[
                c.align === 'right'
                  ? 'td-right'
                  : c.align === 'center'
                    ? 'td-center'
                    : 'td-left',
              ]"
            >
              <span class="cell-text">{{ cellText(r, c) }}</span>
            </td>

            <td v-if="hasActions" class="td-actions">
              <template
                v-for="a in table.actions.filter((x) =>
                  x.visible ? x.visible(r) : true,
                )"
                :key="a.id"
              >
                <button
                  class="btn btn-ghost btn-sm"
                  type="button"
                  :aria-label="actionAria(a, r)"
                  @click="a.onClick(r)"
                >
                  {{ a.label }}
                </button>
              </template>
            </td>
          </tr>

          <tr v-if="!table.pageRows.value.length">
            <td
              :colspan="table.columns.length + (hasActions ? 1 : 0)"
              class="td-empty"
            >
              No results.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <nav class="pager" aria-label="Pagination">
      <button
        class="btn btn-ghost btn-sm"
        type="button"
        :disabled="table.page.value <= 1"
        :aria-disabled="table.page.value <= 1"
        @click="table.setPage(table.page.value - 1)"
      >
        Prev
      </button>

      <div class="pager-info" aria-live="polite">
        Page {{ table.page.value }} / {{ table.totalPages.value }}
      </div>

      <button
        class="btn btn-ghost btn-sm"
        type="button"
        :disabled="table.page.value >= table.totalPages.value"
        :aria-disabled="table.page.value >= table.totalPages.value"
        @click="table.setPage(table.page.value + 1)"
      >
        Next
      </button>
    </nav>
  </section>
</template>
