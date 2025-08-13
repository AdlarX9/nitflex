import SwiftUI

struct WrapperView: View {
    var body: some View {
        ZStack {
            Color(Constants.black)
                .ignoresSafeArea()
            TabView {
                ExplorerView(viewModel: ExplorerViewModel())
                    .tabItem {
                        Label("Explorer", systemImage: "1.circle")
                    }
                SearchView(viewModel: SearchViewModel())
                    .tabItem {
                        Label("Rechercher", systemImage: "2.circle")
                    }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    WrapperView()
}
